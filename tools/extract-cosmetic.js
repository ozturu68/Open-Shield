/**
 * Extract cosmetic filters from ABP filter lists
 * Generates src/cosmetic.js with embedded selector array
 * Usage: node tools/extract-cosmetic.js <input.txt> [--max=N]
 */

const fs = require("fs");
const path = require("path");

const INPUT = process.argv[2];
const maxArg = process.argv.find(a => a.startsWith("--max="));
const MAX_SELECTORS = maxArg ? parseInt(maxArg.slice(6)) : 5000;

if (!INPUT) {
  console.error("Usage: node extract-cosmetic.js <input.txt> [--max=N]");
  process.exit(1);
}

const lines = fs.readFileSync(INPUT, "utf-8").split(/\r?\n/);
const selectors = [];
const seen = new Set();

for (const line of lines) {
  if (selectors.length >= MAX_SELECTORS) break;
  if (!line.includes("##") && !line.includes("#?#")) continue;

  // Skip exception rules
  if (line.startsWith("!")) continue;

  // Extract selector part after ##
  const idx = line.indexOf("##");
  if (idx === -1) continue;

  const selector = line.slice(idx + 2).trim();
  if (!selector || seen.has(selector)) continue;

  // Skip complex procedural filters and scriptlets for now
  if (selector.startsWith("+") || selector.includes(":has(") || selector.includes(":matches-") || selector.includes("#@#")) continue;

  seen.add(selector);
  selectors.push(selector);
}

// Also add our hardcoded high-value selectors
const BASE_SELECTORS = [
  ".ad-container",".ad-banner",".ad-wrapper",".adsbygoogle",".advertisement",
  ".advertising","[id*='google_ads']","[id*='div-gpt-ad']","[class*='sponsored']",
  "[class*='promoted']","[data-ad-slot]","[data-ad-unit]",
  "iframe[src*='googlesyndication']","iframe[src*='doubleclick']","iframe[src*='amazon-adsystem']",
  ".ad",".ads","#ad","#ads",".banner-ads",".ad-placement",".ad-unit",
  "[id*='taboola']","[class*='taboola']","[id*='outbrain']","[class*='outbrain']",
  "[id*='revcontent']","[class*='revcontent']",".rc-uid",".plistaList"
];

for (const s of BASE_SELECTORS) {
  if (!seen.has(s)) {
    seen.add(s);
    selectors.unshift(s);
  }
}

const output = `/**
 * openShield Cosmetic Filter Injector
 * AUTO-GENERATED — Do not edit manually.
 * Injected at document_start, ISOLATED world, all frames.
 */
(function () {
  "use strict";

  const SELECTORS = ${JSON.stringify(selectors)};

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
`;

const outPath = path.join(__dirname, "..", "src", "cosmetic.js");
fs.writeFileSync(outPath, output, "utf-8");
console.log(`Extracted ${selectors.length} cosmetic selectors -> ${outPath}`);
