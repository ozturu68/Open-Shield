/**
 * openShield Cosmetic Filter Injector — Procedural Edition v2
 * Supports uBlock-style procedural operators with pre-parsed selectors.
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

  const RAW_PROCEDURAL = [
    "div:has-text(Reklam):upward(1)",
    "div:has-text(sponsored):upward(2)",
    "div:has-text(advertisement):upward(1)",
    "[class*='ad']:has-text(SPONSORED)",
    ":xpath(//div[contains(@class,'ad')]//span[contains(text(),'Sponsor')])",
    ":xpath(//div[contains(@id,'google_ads')])",
    "div:matches-css(position: fixed):matches-css(z-index: 9999):has(img[src*='ad'])",
    "div:matches-css(position: fixed):matches-css(z-index: 99999):upward(1)",
    "a:min-text-length(3):matches-css(display: block):has(img)"
  ];

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

  function parseOperator(part) {
    if (part.startsWith(":has-text(")) return { type: "has-text", arg: extractArg(part, ":has-text(") };
    if (part.startsWith(":matches-css(")) return { type: "matches-css", arg: extractArg(part, ":matches-css(") };
    if (part.startsWith(":xpath(")) return { type: "xpath", arg: extractArg(part, ":xpath(") };
    if (part.startsWith(":upward(")) return { type: "upward", arg: extractArg(part, ":upward(") };
    if (part.startsWith(":has(")) return { type: "has", arg: extractArg(part, ":has(") };
    if (part.startsWith(":not(")) return { type: "not", arg: extractArg(part, ":not(") };
    if (part.startsWith(":min-text-length(")) return { type: "min-text-length", arg: extractArg(part, ":min-text-length(") };
    if (part.startsWith(":matches-attr(")) return { type: "matches-attr", arg: extractArg(part, ":matches-attr(") };
    if (part.startsWith(":matches-path(")) return { type: "matches-path", arg: extractArg(part, ":matches-path(") };
    return { type: "css", selector: part };
  }

  const PROCEDURAL = RAW_PROCEDURAL.map(sel => {
    const parts = sel.split(/(?=:(?:has-text|matches-css-after|matches-css-before|matches-css|xpath|upward|has|not|min-text-length|matches-attr|matches-path)\()/);
    return parts.map(parseOperator);
  });

  const HIDE_CSS = "display:none!important;visibility:hidden!important;opacity:0!important;height:0!important;min-height:0!important;max-height:0!important;pointer-events:none!important";
  const STYLE_ID = "__osCosmetic";
  const MAX_BATCH = 100;
  const SELECTOR_STRING = SELECTORS.join(",");
  const processed = new WeakSet();

  function matchesProcedural(el, operators) {
    if (!el || el.nodeType !== 1) return false;
    let current = el;
    for (const op of operators) {
      if (!current) return false;
      switch (op.type) {
        case "has-text":
          if (!current.textContent || !current.textContent.includes(op.arg)) return false;
          break;
        case "matches-css": {
          const [prop, val] = op.arg.split(":").map(s => s.trim());
          let computed;
          if (prop.startsWith("before-")) {
            computed = window.getComputedStyle(current, "::before");
            const actual = computed[prop.replace("before-", "")];
            if (actual !== val && !new RegExp(val).test(actual)) return false;
          } else if (prop.startsWith("after-")) {
            computed = window.getComputedStyle(current, "::after");
            const actual = computed[prop.replace("after-", "")];
            if (actual !== val && !new RegExp(val).test(actual)) return false;
          } else {
            computed = window.getComputedStyle(current);
            const actual = computed[prop];
            if (actual !== val && !new RegExp(val).test(actual)) return false;
          }
          break;
        }
        case "xpath": {
          try {
            const result = document.evaluate(op.arg, current.ownerDocument || document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            let found = false;
            for (let i = 0; i < result.snapshotLength; i++) {
              if (result.snapshotItem(i) === current) { found = true; break; }
            }
            if (!found) return false;
          } catch { return false; }
          break;
        }
        case "upward": {
          const levels = parseInt(op.arg, 10) || 1;
          for (let i = 0; i < levels; i++) {
            current = current.parentElement;
            if (!current) return false;
          }
          break;
        }
        case "has":
          if (!current.querySelector(op.arg)) return false;
          break;
        case "not":
          if (current.matches(op.arg)) return false;
          break;
        case "min-text-length": {
          const min = parseInt(op.arg, 10);
          if (isNaN(min) || (current.textContent || "").length < min) return false;
          break;
        }
        case "matches-attr": {
          const sep = op.arg.indexOf(",");
          const attr = sep > 0 ? op.arg.substring(0, sep).trim() : op.arg.trim();
          const val = sep > 0 ? op.arg.substring(sep + 1).trim() : "";
          if (val) {
            const re = new RegExp(val.replace(/^\//, "").replace(/\/$/, ""));
            if (!re.test(current.getAttribute(attr) || "")) return false;
          } else {
            if (!current.hasAttribute(attr)) return false;
          }
          break;
        }
        case "matches-path": {
          const re = new RegExp(op.arg.replace(/^\//, "").replace(/\/$/, ""));
          if (!re.test(location.pathname)) return false;
          break;
        }
        case "css": {
          try { if (!current.matches(op.selector)) return false; } catch { return false; }
          break;
        }
      }
    }
    return true;
  }

  function checkAndHide(el) {
    for (const ops of PROCEDURAL) {
      if (matchesProcedural(el, ops)) { return true; }
    }
    return false;
  }

  const css = SELECTOR_STRING + "{" + HIDE_CSS + "}";

  function inject() {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = css;
    const target = document.head || document.documentElement;
    if (target) target.appendChild(el);
  }

  function hideElement(el) {
    el.style.cssText += HIDE_CSS;
  }

  function processBatch(elements) {
    let count = 0;
    for (const el of elements) {
      if (count >= MAX_BATCH) break;
      if (el.nodeType !== 1) continue;
      if (processed.has(el)) continue;
      processed.add(el);
      count++;
      if (checkAndHide(el)) { hideElement(el); continue; }
      if (el.matches?.(SELECTOR_STRING)) { hideElement(el); continue; }
      const matches = el.querySelectorAll?.(SELECTOR_STRING);
      if (matches) for (const m of matches) { if (!processed.has(m)) { processed.add(m); hideElement(m); } }
    }
  }

  let pending = [];
  let scheduled = false;
  let debounceTimer = null;
  let lastFlush = 0;
  const DEBOUNCE_MS = 50;
  const MAX_PENDING = 500;
  const MAX_WAIT_MS = 200;

  function flush() {
    scheduled = false;
    debounceTimer = null;
    lastFlush = Date.now();
    const nodes = pending.splice(0);
    processBatch(nodes);
  }

  function schedule() {
    if (scheduled) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(flush, DEBOUNCE_MS);
      return;
    }
    if (pending.length >= MAX_PENDING) {
      flush();
      return;
    }
    const elapsed = Date.now() - lastFlush;
    if (elapsed >= MAX_WAIT_MS && pending.length > 0) {
      flush();
      return;
    }
    scheduled = true;
    debounceTimer = setTimeout(flush, DEBOUNCE_MS);
  }

  const obs = new MutationObserver(function(ms) {
    if (!document.getElementById(STYLE_ID)) inject();
    let hasElements = false;
    for (const m of ms) {
      if (m.type === "childList") {
        for (const n of m.addedNodes) {
          if (n.nodeType === Node.ELEMENT_NODE) {
            pending.push(n);
            hasElements = true;
            if (pending.length >= MAX_PENDING) { flush(); return; }
          }
        }
      }
    }
    if (!hasElements) return;
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

  if (document.readyState !== "loading") {
    const body = document.body;
    if (body) {
      processBatch(body.querySelectorAll("*"));
      const matches = body.querySelectorAll(SELECTOR_STRING);
      for (const el of matches) { if (!processed.has(el)) { processed.add(el); hideElement(el); } }
    }
  }
})();
