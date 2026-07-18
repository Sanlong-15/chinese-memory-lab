// ============================================================
// Character Memory Lab — Lesson Generator (Cloudflare Worker)
//
// This is the small backend that holds your Anthropic API key
// safely (never in the browser) and calls Claude to turn a list
// of Chinese words into a full lesson: pinyin, English, Khmer,
// 5 example sentences per word, character stories, and pattern
// groups — matching the same schema the site's template expects.
//
// Deploy instructions: see worker/README.md
//
// Required secrets (set with `wrangler secret put NAME`, or in the
// Cloudflare dashboard under Settings -> Variables):
//   ANTHROPIC_API_KEY   your Anthropic API key
//   PASSPHRASE           a password you make up yourself
//
// Optional plain variable:
//   ALLOWED_ORIGIN        your site's origin, e.g.
//                          https://yourname.github.io
//                          (defaults to "*" — anyone can call this
//                          Worker if they also know your passphrase)
// ============================================================

const WORD_CAP = 40;
const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 16000;

const SYSTEM_PROMPT = `You are generating Chinese vocabulary study content for a personal study site called Character Memory Lab. For the given list of Chinese words, produce accurate, natural study content by calling the generate_lesson tool. Do not write any other commentary — only call the tool.

Rules you must follow exactly:

1. For each word, give: pinyin (correct tone marks), a plain English meaning, a good-faith Khmer translation (best-effort is fine and expected — this is never presented as verified, so just make a genuine careful attempt), and a breakdown string. Breakdown is only for multi-character words, format "char(gloss)+char(gloss)" per character in reading order; for single-character words use "-".

2. Each word needs EXACTLY 5 example sentences: 3 tagged "HSK1" (simple sentences — basic SVO, 是, 很+adjective, simple time words) and 2 tagged "HSK2" (more complex — compound grammar like 虽然...但是, 因为...所以, 比, resultative complements, 了 as an aspect marker, etc., but still natural, not contrived). All 5 examples for a word must stay consistent with the SAME specific sense/usage of that word — don't drift to an unrelated meaning partway through.

3. For every UNIQUE character across all the words, classify it as exactly one of: pictograph, compound, phono, whole.
   - pictograph: an ancient picture with no meaningful sub-parts (一, 人, 木...)
   - compound: two+ parts that each contribute MEANING (好 = woman + child)
   - phono: one part gives SOUND, another gives MEANING category (妈 = 女 meaning + 马 sound)
   - whole: the modern shape does NOT cleanly split into parts you can honestly explain. When this is the case, parts and story must BOTH be exactly "-". This is the single most important rule: never invent a fake or folk-etymology story to force a character into pictograph/compound/phono. An honest "whole, no reliable split" is far more useful to a learner than a made-up explanation, because a fake story actively teaches the wrong thing. When genuinely unsure whether a split is real, prefer "whole".

4. Pattern groups (sound-clue families) and radical groups (meaning-clue families): only form a group when at least 2 of the ACTUAL unique characters in this specific word list share a phonetic component (pattern group) or a semantic radical (radical group). Do not reference any character that isn't in the submitted word list. It's completely normal and expected for a short list to produce few or zero groups — do not force or pad groups to have something to show.

5. Every example sentence, story, and translation must be something a careful, honest human teacher would actually say — no placeholders, no invented facts.`;

const TOOL_SCHEMA = {
  name: "generate_lesson",
  description: "Return the full generated lesson content for the submitted word list.",
  input_schema: {
    type: "object",
    properties: {
      words: {
        type: "array",
        description: "One entry per submitted word, in the same order as submitted.",
        items: {
          type: "object",
          properties: {
            chinese: { type: "string", description: "The exact word as submitted." },
            pinyin: { type: "string" },
            english: { type: "string" },
            khmer: { type: "string" },
            breakdown: { type: "string" },
            examples: {
              type: "array",
              minItems: 5,
              maxItems: 5,
              items: {
                type: "object",
                properties: {
                  level: { type: "string", enum: ["HSK1", "HSK2"] },
                  cn: { type: "string" },
                  py: { type: "string" },
                  en: { type: "string" },
                },
                required: ["level", "cn", "py", "en"],
              },
            },
          },
          required: ["chinese", "pinyin", "english", "khmer", "breakdown", "examples"],
        },
      },
      charInfo: {
        type: "array",
        description: "One entry per unique character across all submitted words.",
        items: {
          type: "object",
          properties: {
            char: { type: "string" },
            type: { type: "string", enum: ["pictograph", "compound", "phono", "whole"] },
            parts: { type: "string" },
            story: { type: "string" },
          },
          required: ["char", "type", "parts", "story"],
        },
      },
      charToFamily: {
        type: "array",
        description: "Only characters that belong to a pattern or radical group below.",
        items: {
          type: "object",
          properties: {
            char: { type: "string" },
            families: { type: "array", items: { type: "string" } },
          },
          required: ["char", "families"],
        },
      },
      patternGroups: {
        type: "array",
        items: {
          type: "object",
          properties: {
            sound_component: { type: "string" },
            title: { type: "string" },
            explain: { type: "string" },
            members: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  char: { type: "string" },
                  pinyin: { type: "string" },
                  parts: { type: "string" },
                  gloss: { type: "string" },
                },
                required: ["char", "pinyin", "parts", "gloss"],
              },
            },
          },
          required: ["sound_component", "title", "explain", "members"],
        },
      },
      radicalGroups: {
        type: "array",
        items: {
          type: "object",
          properties: {
            radical: { type: "string" },
            meaning: { type: "string" },
            members: { type: "array", items: { type: "string" } },
          },
          required: ["radical", "meaning", "members"],
        },
      },
    },
    required: ["words", "charInfo", "charToFamily", "patternGroups", "radicalGroups"],
  },
};

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

// Constant-time-ish string compare so we don't leak passphrase length/content via timing.
function safeCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || "*";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== "POST") {
      return jsonResponse({ error: "Use POST." }, 405, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch (err) {
      return jsonResponse({ error: "Bad request body." }, 400, origin);
    }

    const { passphrase, words, lessonName } = body || {};

    if (!env.PASSPHRASE || !safeCompare(passphrase, env.PASSPHRASE)) {
      return jsonResponse({ error: "Wrong passphrase." }, 401, origin);
    }
    if (!Array.isArray(words) || words.length === 0) {
      return jsonResponse({ error: "No words submitted." }, 400, origin);
    }
    if (words.length > WORD_CAP) {
      return jsonResponse({ error: `Too many words — max ${WORD_CAP} per upload.` }, 413, origin);
    }
    if (!env.ANTHROPIC_API_KEY) {
      return jsonResponse({ error: "Server is missing its API key. Check the Worker's secrets." }, 500, origin);
    }

    const userMessage =
      `Generate the lesson content for exactly these ${words.length} words, in this order:\n` +
      words.map((w, i) => `${i + 1}. ${w}`).join("\n");

    let anthropicRes;
    try {
      anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMessage }],
          tools: [TOOL_SCHEMA],
          tool_choice: { type: "tool", name: "generate_lesson" },
        }),
      });
    } catch (err) {
      return jsonResponse({ error: "Couldn't reach the Anthropic API: " + err.message }, 502, origin);
    }

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      return jsonResponse(
        { error: `Anthropic API error (${anthropicRes.status}): ${errText.slice(0, 300)}` },
        502,
        origin,
      );
    }

    const apiResult = await anthropicRes.json();

    if (apiResult.stop_reason === "max_tokens") {
      return jsonResponse(
        { error: "The AI's response got cut off (too much output). Try fewer words per upload." },
        500,
        origin,
      );
    }

    const toolUse = (apiResult.content || []).find((block) => block.type === "tool_use");
    if (!toolUse) {
      return jsonResponse({ error: "The AI didn't return structured data. Try again." }, 500, origin);
    }

    const raw = toolUse.input;

    // --- Transform model output into the shape the site's template expects ---
    const level = (lessonName || "Lesson").trim();
    const finalWords = [];
    let nextId = 1;
    for (const submittedWord of words) {
      const match = (raw.words || []).find((w) => w.chinese === submittedWord);
      if (!match) continue; // model skipped this word — omit rather than guess
      const chars = Array.from(submittedWord);
      finalWords.push({
        id: nextId++,
        level,
        chinese: submittedWord,
        pinyin: match.pinyin,
        english: match.english,
        khmer: match.khmer,
        breakdown: chars.length > 1 ? match.breakdown : "-",
        examples: Array.isArray(match.examples) ? match.examples.slice(0, 5) : [],
        chars,
      });
    }

    const charInfo = {};
    (raw.charInfo || []).forEach((c) => {
      charInfo[c.char] = { type: c.type, parts: c.parts, story: c.story };
    });

    const charToFamily = {};
    (raw.charToFamily || []).forEach((c) => {
      charToFamily[c.char] = c.families;
    });

    const patternGroups = (raw.patternGroups || []).map((g) => ({
      sound_component: g.sound_component,
      title: g.title,
      explain: g.explain,
      members: (g.members || []).map((m) => [m.char, m.pinyin, m.parts, m.gloss]),
    }));

    const radicalGroups = (raw.radicalGroups || []).map((g) => ({
      radical: g.radical,
      meaning: g.meaning,
      members: g.members || [],
    }));

    if (finalWords.length === 0) {
      return jsonResponse({ error: "The AI didn't return any usable words. Try again." }, 500, origin);
    }

    return jsonResponse(
      { words: finalWords, charInfo, charToFamily, patternGroups, radicalGroups },
      200,
      origin,
    );
  },
};
