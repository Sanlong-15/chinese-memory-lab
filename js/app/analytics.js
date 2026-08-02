// app/analytics.js — Google Analytics 4 (GA4).
//
// PRIVACY NOTE: this app needs no accounts and stores progress locally. Analytics
// is OFF by default. To enable it, put your GA4 Measurement ID below. Until then
// nothing is loaded and no data is sent.
//
// It also respects the browser's "Do Not Track" signal.

(function () {
  const GA_ID = "G-XXXXXXXXXX"; // <-- replace with your GA4 ID to enable

  const disabled =
    !GA_ID ||
    GA_ID.indexOf("XXXX") !== -1 ||
    navigator.doNotTrack === "1" ||
    window.doNotTrack === "1";

  if (disabled) {
    if (typeof Log !== "undefined") Log.info("analytics disabled");
    return;
  }

  // Load the gtag library on demand (only when actually enabled).
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag("js", new Date());
  // anonymize_ip trims the visitor IP; a small privacy courtesy.
  gtag("config", GA_ID, { anonymize_ip: true });
  if (typeof Log !== "undefined") Log.info("analytics enabled");
})();
