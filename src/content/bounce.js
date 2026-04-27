/**
 * Bounce tracking detector (ISOLATED world)
 */
(function () {
  "use strict";
  const DOMAINS = ["l.facebook.com","lm.facebook.com","l.messenger.com","t.co","ow.ly","bit.ly","tinyurl.com","buff.ly","rebrand.ly","short.link","amzn.to","go.skimresources.com","out.reddit.com","lnkd.in","t.umblr.com","trib.al","ift.tt","d.agkn.com","x.co","p.liadm.com","linksynergy.com","href.li","pix.li","anrdoezrs.net","dpbolvw.net","jdoqocy.com","kqzyfj.com","tkqlhce.com","emjcd.com"];
  if (!DOMAINS.includes(location.hostname)) return;
  const p = new URLSearchParams(location.search);
  const d = p.get("u") || p.get("url") || p.get("next") || p.get("target");
  if (d) {
    let decoded;
    try { decoded = decodeURIComponent(d); } catch { return; }
    if (/^https?:\/\//i.test(decoded)) {
      try { new URL(decoded); } catch { return; }
      chrome.runtime.sendMessage({ type: "BOUNCE", dest: decoded });
    }
  }
})();
