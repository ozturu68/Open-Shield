/**
 * openShield Cosmetic Filter Injector — Procedural Edition
 * Supports uBlock-style procedural operators: :has-text(), :matches-css(), :xpath(), :upward()
 * ISOLATED world, document_start, all frames.
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
    "[data-google-query-id]","[data-ad-client]",
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

  const PROCEDURAL_SELECTORS = [
    "div:has-text(Reklam):upward(1)",
    "div:has-text(sponsored):upward(2)",
    "div:has-text(advertisement):upward(1)",
    "[class*='ad']:has-text(SPONSORED)",
    ":xpath(//div[contains(@class,'ad')]//span[contains(text(),'Sponsor')])",
    ":xpath(//div[contains(@id,'google_ads')])",
    "div:matches-css(position: fixed):matches-css(z-index: 9999):has(img[src*='ad'])",
    "div:matches-css-after(content: /ad/):upward(1)"
  ];

  const HIDE_CSS = "display:none!important;visibility:hidden!important;opacity:0!important;height:0!important;min-height:0!important;max-height:0!important;pointer-events:none!important";
  const STYLE_ID = "__osCosmetic";

  // ── Procedural Selector Engine ──
  function matchesProcedural(el, selector) {
    if (!el || el.nodeType !== 1) return false;

    // :: operator chain
    const parts = selector.split(/(?=:(?:has-text|matches-css|xpath|upward|has|not|min-text-length|matches-attr|matches-path)\()/);

    let current = el;
    for (const part of parts) {
      if (!current) return false;

      if (part.startsWith(":has-text(")) {
        const text = extractArg(part, ":has-text(");
        if (!text) continue;
        if (!current.textContent || !current.textContent.includes(text)) return false;
      } else if (part.startsWith(":matches-css(")) {
        const css = extractArg(part, ":matches-css(");
        if (!css) continue;
        const [prop, val] = css.split(":").map(s => s.trim());
        const computed = window.getComputedStyle(current);
        if (prop.startsWith("before-")) {
          const pseudo = window.getComputedStyle(current, "::before");
          if (pseudo[prop.replace("before-", "")] !== val && !new RegExp(val).test(pseudo[prop.replace("before-", "")])) return false;
        } else if (prop.startsWith("after-")) {
          const pseudo = window.getComputedStyle(current, "::after");
          if (pseudo[prop.replace("after-", "")] !== val && !new RegExp(val).test(pseudo[prop.replace("after-", "")])) return false;
        } else {
          if (computed[prop] !== val && !new RegExp(val).test(computed[prop])) return false;
        }
      } else if (part.startsWith(":xpath(")) {
        const xpath = extractArg(part, ":xpath(");
        if (!xpath) continue;
        try {
          const result = document.evaluate(xpath, current.ownerDocument || document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          let found = false;
          for (let i = 0; i < result.snapshotLength; i++) {
            if (result.snapshotItem(i) === current) { found = true; break; }
          }
          if (!found) return false;
        } catch { return false; }
      } else if (part.startsWith(":upward(")) {
        const levels = parseInt(extractArg(part, ":upward("), 10) || 1;
        let ancestor = current;
        for (let i = 0; i < levels; i++) {
          ancestor = ancestor.parentElement;
          if (!ancestor) return false;
        }
        current = ancestor;
      } else if (part.startsWith(":has(")) {
        const subSel = extractArg(part, ":has(");
        if (!subSel) continue;
        if (!current.querySelector(subSel)) return false;
      } else if (part.startsWith(":min-text-length(")) {
        const min = parseInt(extractArg(part, ":min-text-length("), 10);
        if (isNaN(min)) continue;
        if ((current.textContent || "").length < min) return false;
      } else if (part.startsWith(":not(")) {
        const subSel = extractArg(part, ":not(");
        if (!subSel) continue;
        if (current.matches(subSel)) return false;
      } else if (part.startsWith(":matches-attr(")) {
        const arg = extractArg(part, ":matches-attr(");
        if (!arg) continue;
        const sep = arg.indexOf(",");
        const attr = sep > 0 ? arg.substring(0, sep).trim() : arg.trim();
        const val = sep > 0 ? arg.substring(sep + 1).trim() : "";
        if (val) {
          const re = new RegExp(val.replace(/^\//, "").replace(/\/$/, ""));
          if (!re.test(current.getAttribute(attr) || "")) return false;
        } else {
          if (!current.hasAttribute(attr)) return false;
        }
      } else if (part.startsWith(":matches-path(")) {
        const path = extractArg(part, ":matches-path(");
        if (!path) continue;
        const re = new RegExp(path.replace(/^\//, "").replace(/\/$/, ""));
        if (!re.test(location.pathname)) return false;
      } else if (current.matches) {
        // Standard CSS selector
        if (!current.matches(part)) return false;
      }
    }
    return true;
  }

  function extractArg(str, prefix) {
    const start = str.indexOf(prefix) + prefix.length;
    if (start === -1 + prefix.length) return "";
    let depth = 1;
    let i = start;
    while (i < str.length && depth > 0) {
      if (str[i] === "(") depth++;
      else if (str[i] === ")") depth--;
      i++;
    }
    return str.substring(start, i - 1);
  }

  // ── Style injection ──
  const css = SELECTORS.join(",") + "{" + HIDE_CSS + "}";

  function inject() {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = css;
    const target = document.head || document.documentElement;
    if (target) target.appendChild(el);
  }

  inject();

  // ── Procedural matching ──
  function hideElement(el) {
    el.style.cssText += HIDE_CSS;
  }

  function checkProcedural(el) {
    if (el.nodeType !== 1) return;
    if (el.id === STYLE_ID) return;
    for (const sel of PROCEDURAL_SELECTORS) {
      if (matchesProcedural(el, sel)) {
        hideElement(el);
        return;
      }
    }
    for (const sel of SELECTORS) {
      if (el.matches?.(sel)) {
        hideElement(el);
        return;
      }
    }
    for (const sel of SELECTORS) {
      const q = el.querySelectorAll?.(sel);
      if (!q) continue;
      for (const c of q) hideElement(c);
    }
    for (const sel of PROCEDURAL_SELECTORS) {
      const all = el.querySelectorAll?.("*");
      if (!all) continue;
      for (const c of all) {
        if (matchesProcedural(c, sel)) hideElement(c);
      }
    }
  }

  let pending = [];
  let scheduled = false;

  function flush() {
    scheduled = false;
    const nodes = pending;
    pending = [];
    for (const n of nodes) {
      checkProcedural(n);
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(flush, { timeout: 100 });
    } else {
      requestAnimationFrame(flush);
    }
  }

  const obs = new MutationObserver(function(ms) {
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
    addEventListener("DOMContentLoaded", function() {
      inject();
      if (document.documentElement) obs.observe(document.documentElement, { childList: true, subtree: true });
    }, { once: true });
  }

  // ── Initial scan ──
  if (document.readyState !== "loading") {
    checkProcedural(document.body || document.documentElement);
  }
})();
