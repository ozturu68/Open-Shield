/**
 * Bounce tracking detector (ISOLATED world)
 */
(function () {
  "use strict";
  const DOMAINS = ["l.facebook.com","l.messenger.com","t.co","ow.ly","bit.ly","tinyurl.com","buff.ly","rebrand.ly","short.link"];
  if (!DOMAINS.includes(location.hostname)) return;
  const p = new URLSearchParams(location.search);
  const d = p.get("u") || p.get("url") || p.get("next") || p.get("target");
  if (d && /^https?:\/\//i.test(decodeURIComponent(d))) {
    chrome.runtime.sendMessage({ type: "BOUNCE", dest: decodeURIComponent(d) });
  }
})();
