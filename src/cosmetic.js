/**
 * openShield Cosmetic Filter Injector
 * AUTO-GENERATED — Do not edit manually.
 * Injected at document_start, ISOLATED world, all frames.
 */
(function () {
  "use strict";

  const SELECTORS = [
    ".ad-container",".ad-banner",".ad-wrapper",".adsbygoogle",".advertisement",
    ".advertising","[id*='google_ads']","[id*='div-gpt-ad']","[class*='sponsored']",
    "[class*='promoted']","[data-ad-slot]","[data-ad-unit]",
    "iframe[src*='googlesyndication']","iframe[src*='doubleclick']","iframe[src*='amazon-adsystem']",
    ".ad",".ads","#ad","#ads",".banner-ads",".ad-placement",".ad-unit",
    "[id*='taboola']","[class*='taboola']","[id*='outbrain']","[class*='outbrain']",
    "[id*='revcontent']","[class*='revcontent']",".rc-uid",".plistaList",
    "[id*='mgid']","[class*='mgid']","[id*='adfox']","[class*='adfox']",
    "[id*='yandex_ad']","[class*='yandex_ad']",".yandex-direct",".yap-ad",
    "[id*='rtb']","[class*='rtb']","[id*='sape']","[class*='sape']",
    "[class*='adsense']","[id*='adsense']",".google-ad",".googleads",
    "[data-google-query-id]","[data-ad-client]","[data-ad-slot]",
    ".dfp-ad",".dfp-ad-unit","[id*='dfp-ad']","[class*='dfp-ad']",
    ".gpt-ad","[id*='gpt-ad']",".pub_300x250",".pub_300x250m",
    ".pub_728x90",".text-ad",".text-ad-links",".text-ads",
    "[id*='AdBanner']","[class*='AdBanner']","[id*='TopAd']","[class*='TopAd']",
    ".sidebar-ad",".header-ad",".footer-ad",".content-ad",".preloader-ad",
    ".video-ad",".overlay-ad",".interstitial-ad",".native-ad",
    "[class*='__advert']","[class*='__ads']","[class*='_ad_']",
    "amp-ad",".amp-ad","[type='adsense']","[type='doubleclick']",
    ".carbonad","#carbonads",".adthrive",".mediavine",".ezoic-ad",
    "[class*='sponsored-content']","[class*='partner-content']",
    "[class*='affiliate']","[class*='promotion']",".newsletter-signup",
    ".cookie-banner",".cookie-consent",".cookie-notice",".gdpr-banner",
    ".consent-banner",".cc-banner","#onetrust-consent-sdk",
    ".modal-backdrop[style*='z-index: 999']",".overlay-backdrop"
  ];

  const STYLE_ID = "__osCosmetic";
  const css = SELECTORS.join(",") + "{display:none!important;visibility:hidden!important;opacity:0!important;height:0!important;min-height:0!important;max-height:0!important}";

  function inject() {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = css;
    const target = document.head || document.documentElement;
    if (target) target.appendChild(el);
  }

  inject();

  let pending = [];
  let scheduled = false;

  function flush() {
    scheduled = false;
    const nodes = pending;
    pending = [];
    for (const n of nodes) {
      if (n.nodeType !== 1) continue;
      const e = n;
      if (e.id === STYLE_ID) continue;
      for (const s of SELECTORS) {
        if (e.matches?.(s)) { e.style.cssText += "display:none!important;visibility:hidden!important"; break; }
      }
      for (const s of SELECTORS) {
        const q = e.querySelectorAll?.(s);
        if (!q) continue;
        for (const c of q) c.style.cssText += "display:none!important;visibility:hidden!important";
      }
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(flush, { timeout: 50 });
    } else {
      requestAnimationFrame(flush);
    }
  }

  const obs = new MutationObserver(ms => {
    if (!document.getElementById(STYLE_ID)) inject();
    for (const m of ms) {
      if (m.type === "childList") {
        for (const n of m.addedNodes) pending.push(n);
      }
    }
    if (pending.length) schedule();
  });

  if (document.documentElement) {
    obs.observe(document.documentElement, { childList: true, subtree: true });
  } else {
    addEventListener("DOMContentLoaded", () => {
      inject();
      if (document.documentElement) obs.observe(document.documentElement, { childList: true, subtree: true });
    }, { once: true });
  }
})();
