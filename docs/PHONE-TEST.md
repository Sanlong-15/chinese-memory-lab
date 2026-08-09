# Phone Test — 10 minutes

Goal: check the app on a real phone. This is the one thing that can't be tested
from code. Walk the steps, note anything that looks or feels wrong, and send the
findings table back.

## Setup (1 min)

1. On your phone's browser, open: https://sanlong-15.github.io/chinese-memory-lab/
2. Optional but good: tap Share → "Add to Home Screen." This installs it as an
   app (tests the PWA). Open it from the home-screen icon.
3. Hold the phone in portrait, as a normal user would.

## The walk (test each — most check a change we just made)

1. **First screen.** Does the header look small and tidy? Is the "Today's plan"
   and the big "Start today's session" button visible without scrolling much?
2. **Bottom navigation.** Is there a bar at the very bottom with Today / Learn /
   Practice / Progress / You? Tap each one — does the section change? Does the
   bar sit *above* the iPhone home bar (not hidden behind it)?
3. **No sideways scroll.** On every screen, try to swipe left/right. The page
   should NOT scroll sideways. Watch for anything cut off at the edge.
4. **Start a session.** Tap "Start today's session." Is the card centered? Answer
   a few questions.
   - Do you **hear a sound** when you answer (a rise for right, a low note for wrong)?
   - On a character question, does it **speak the word** after you answer?
   - Is the ✓ or ✗ mark visible on the chosen option (not just a color)?
5. **A lesson.** Learn → Course → Lesson 1. Check the **progress bar** and "1 / N"
   at the top fills as you tap Continue. Read one word, tap Reveal, then go
   through grammar → conversation → the quiz.
6. **Tap size.** Are the small filter chips and buttons easy to tap with a thumb,
   or too small/fiddly?
7. **Night mode.** Tap "Night mode" (top right). Read the rating buttons
   (Again/Hard/Good/Easy) and any orange/green text — is everything still easy to
   read, or is anything too faint?
8. **Offline.** Turn on Airplane mode. A strip should appear at the top: "You're
   offline…". Can you still open a lesson and answer? Turn Airplane mode off — the
   strip should disappear.
9. **Reopen.** Close the app fully and reopen it. Is your progress/streak still
   there?

## Send this back (fill in only the problems)

| # | Screen | What looked/felt wrong | How bad (block / annoying / minor) |
| --- | --- | --- | --- |
|  |  |  |  |

If everything was fine, just say "all good" and which phone + browser you used
(e.g. iPhone 13, Safari) — that tells me the size it was tested at.

## The other two passes (later, not now)

- Screen-reader check: `docs/A11Y-AUDIT.md` (turn on VoiceOver).
- Real learners: `docs/USER-TESTING.md` (3–5 people).
