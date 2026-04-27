/**
 * openShield Background Service Worker — Main Orchestrator
 * v1.6.0 — Modular architecture, batched I/O, message validation.
 */
import { DEFAULT_SETTINGS, FP_NOISE_FACTORS, KEY, SESSION, MSG, BOUNCE_DOMAINS, MESSAGE_SCHEMAS, ALARM_COHORT_CLEANUP } from "../core/config.js";
import { hostname, isBrowser, normHost, seed, validateMessage, isValidHostname, isValidDestination, isAMP } from "../core/utils.js";

import { installAll } from "./injections.js";
import { initDefaults, effective, counters, inc, pushLog, getLog } from "./settings.js";
import { setShields, setDynamic3p, setJSBlocked, isJSBlocked, checkDNRQuota } from "./dnr.js";
import { getCohortStats, cleanupCohortDB } from "./cohort.js";
import { handleLearningSignals } from "./learning.js";
import { runFilterUpdates, setupFilterAlarm } from "./filters.js";
import { setupTabListeners, setIcon } from "./tab-lifecycle.js";

const ALLOWED_SITE_KEYS_SET = new Set(["shields", "ads", "fp", "fpLevel", "https", "cookies", "bounce", "params", "cosmetic", "shred", "gpc", "linkProtection", "clickToLoad", "dynamic3p", "proceduralCosmetic", "learningMode", "secureJS", "xssProtection", "ampProtection"]);
const ALLOWED_GLOBAL_KEYS_SET = new Set(["ads", "fp", "fpLevel", "https", "cookies", "bounce", "params", "cosmetic", "shred", "gpc", "linkProtection", "clickToLoad", "dynamic3p", "proceduralCosmetic", "learningMode", "secureJS", "xssProtection", "ampProtection"]);

// ── Initialization ──
chrome.runtime.onInstalled.addListener(() => {
  initDefaults().catch(() => {});
  runFilterUpdates(checkDNRQuota).catch(() => {});
});
chrome.runtime.onStartup?.addListener(() => {
  initDefaults().catch(() => {});
  runFilterUpdates(checkDNRQuota).catch(() => {});
});

// ── Tab Lifecycle ──
setupTabListeners();

// ── Alarm Handler ──
chrome.alarms.create(ALARM_COHORT_CLEANUP, { periodInMinutes: 1440 });
setupFilterAlarm();
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM_COHORT_CLEANUP) cleanupCohortDB().catch(() => {});
  if (alarm.name === "filterUpdate") runFilterUpdates(checkDNRQuota).catch(() => {});
});

// ── Script Injection ──
chrome.webNavigation.onCommitted.addListener(async d => {
  if (d.frameId !== 0) return;
  if (isBrowser(d.url)) return;
  const h = normHost(hostname(d.url));
  if (!h) return;

  if (isAMP(d.url)) {
    try {
      const cfg = await effective(h);
      if (cfg.ampProtection !== false) {
        chrome.scripting.executeScript({
          target: { tabId: d.tabId },
          world: "ISOLATED",
          func: () => {
            const link = document.querySelector('link[rel="canonical"]');
            if (link?.href) chrome.runtime.sendMessage({ type: "AMP_REDIRECT", canonical: link.href }).catch(() => {});
          },
          injectImmediately: true
        }).catch(() => {});
      }
    } catch (err) {
      console.warn("[openShield] AMP protection failed:", err?.message || err);
    }
    return;
  }

  injectAll(d.tabId, h).catch(() => {});
});

async function injectAll(tabId, h) {
  if (!isValidHostname(h) || isBrowser(h)) return;
  const cfg = await effective(h);
  if (cfg.shields === false) return;

  const hasFarbling = cfg.fp !== false || cfg.gpc !== false;
  if (!hasFarbling && !cfg.learningMode) {
    if (cfg.gpc !== false) {
      chrome.scripting.executeScript({ target: { tabId }, world: "MAIN", func: installAll, args: [null, 0, cfg.learningMode === true], injectImmediately: true }).catch(() => {});
    }
    return;
  }

  let seedVal = null, factor = 1;
  if (cfg.fp !== false) {
    const s = await chrome.storage.session.get(SESSION.SEEDS);
    const seeds = s[SESSION.SEEDS] || {};
    let sv = seeds[h];
    if (!sv) { sv = seed(); seeds[h] = sv; await chrome.storage.session.set({ [SESSION.SEEDS]: seeds }); }
    seedVal = sv;
    const fLevel = cfg.fpLevel || "medium";
    factor = FP_NOISE_FACTORS[fLevel] ?? FP_NOISE_FACTORS.medium;
  }

  chrome.scripting.executeScript({ target: { tabId }, world: "MAIN", func: installAll, args: [seedVal, factor, cfg.learningMode === true], injectImmediately: true }).catch(() => {});
}

// ── Bounce Tracking ──
chrome.webNavigation.onBeforeNavigate.addListener(d => {
  if (d.frameId !== 0) return;
  const h = normHost(hostname(d.url));
  if (!h || !BOUNCE_DOMAINS.includes(h)) return;
  try {
    const u = new URL(d.url);
    const dest = u.searchParams.get("u") || u.searchParams.get("url") || u.searchParams.get("next") || u.searchParams.get("target");
    if (!dest) return;
    let decoded;
    try { decoded = decodeURIComponent(dest); } catch (err) { console.warn("[openShield] bounce decode failed:", err?.message || err); return; }
    if (!/^https?:\/\//i.test(decoded)) return;
    const parsed = new URL(decoded);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return;
    if (parsed.hostname === h) return;
    chrome.tabs.update(d.tabId, { url: decoded }).catch(() => {});
    inc(d.tabId, "bounces").catch(() => {});
  } catch (err) {
    console.warn("[openShield] bounce tracking failed:", err?.message || err);
  }
});

// ── DNR Match Listener ──
if (chrome.declarativeNetRequest?.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(info => {
    const tabId = info.tabId;
    if (!tabId || tabId < 0) return;
    const rs = info.rule?.rulesetId || "";
    const cat = rs === "https_upgrade" ? "upgraded" : "blocked";
    inc(tabId, cat === "upgraded" ? "upgraded" : "blocked").catch(() => {});
    pushLog(tabId, { url: info.request?.url || "", ruleId: info.rule?.ruleId || 0, rs, t: Date.now() }).catch(() => {});
  });
}

// ── Message Router ──
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => {
    switch (msg.type) {
      case MSG.GET_STATE: {
        if (!validateMessage(msg, MESSAGE_SCHEMAS[MSG.GET_STATE])) { reply({ error: "invalid GET_STATE parameters" }); return; }
        const tab = await chrome.tabs.get(msg.tabId);
        const h = normHost(hostname(tab.url || ""));
        const cfg = h ? await effective(h) : { ...DEFAULT_SETTINGS };
        const c = await counters(msg.tabId);
        const blocked = h ? await isJSBlocked(h) : false;
        reply({ h, cfg, counts: c, jsBlocked: blocked });
        break;
      }
      case MSG.SET_SITE: {
        if (!validateMessage(msg, MESSAGE_SCHEMAS[MSG.SET_SITE]) || !isValidHostname(msg.h) || !ALLOWED_SITE_KEYS_SET.has(msg.k)) {
          reply({ error: "invalid SET_SITE parameters" }); return;
        }
        const s = await chrome.storage.local.get(KEY.SITES);
        const sites = s[KEY.SITES] || {};
        sites[msg.h] = sites[msg.h] || {};
        sites[msg.h][msg.k] = msg.v;
        if (msg.k === "shields") await setShields(msg.h, msg.v !== false);
        if (msg.k === "dynamic3p") await setDynamic3p(msg.h, msg.v !== false);
        if (msg.k === "secureJS") await setJSBlocked(msg.h, msg.v !== false);
        await chrome.storage.local.set({ [KEY.SITES]: sites });
        reply({ ok: true });
        break;
      }
      case MSG.SET_GLOBAL: {
        if (!validateMessage(msg, MESSAGE_SCHEMAS[MSG.SET_GLOBAL]) || !ALLOWED_GLOBAL_KEYS_SET.has(msg.k)) {
          reply({ error: "invalid SET_GLOBAL parameters" }); return;
        }
        if (msg.k === "ads" && typeof msg.v !== "string") { reply({ error: "invalid value for ads" }); return; }
        if (msg.k === "fpLevel" && typeof msg.v !== "string") { reply({ error: "invalid value for fpLevel" }); return; }
        if (msg.k !== "ads" && msg.k !== "fpLevel" && typeof msg.v !== "boolean") { reply({ error: "invalid value type" }); return; }
        const s = await chrome.storage.local.get(KEY.GLOBAL);
        const g = s[KEY.GLOBAL] || {};
        g[msg.k] = msg.v;
        await chrome.storage.local.set({ [KEY.GLOBAL]: g });
        reply({ ok: true });
        break;
      }
      case MSG.GET_LOG: {
        if (!validateMessage(msg, MESSAGE_SCHEMAS[MSG.GET_LOG])) { reply({ error: "invalid GET_LOG parameters" }); return; }
        reply({ log: await getLog(msg.tabId) });
        break;
      }
      case MSG.GET_COHORT_STATS:
        reply({ stats: await getCohortStats() });
        break;
      case "SET_RULESET": {
        if (typeof msg.rulesetId !== "string") { reply({ error: "invalid rulesetId" }); return; }
        try {
          if (msg.enabled) await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: [msg.rulesetId] });
          else await chrome.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds: [msg.rulesetId] });
          reply({ ok: true });
        } catch (e) { reply({ error: e.message }); }
        break;
      }
      case "SET_ALLOWLIST": {
        if (!Array.isArray(msg.allow) || !Array.isArray(msg.block)) { reply({ error: "invalid params" }); return; }
        try {
          const existing = await chrome.declarativeNetRequest.getDynamicRules();
          const remove = existing.filter(r => r.id >= 150_000 && r.id < 200_000).map(r => r.id);
          const add = msg.allow.map((domain, i) => ({
            id: 150_000 + i, priority: 2000, action: { type: "allow" },
            condition: { initiatorDomains: [domain], resourceTypes: ["main_frame","sub_frame","script","image","stylesheet","xmlhttprequest","media","font","other"] }
          }));
          await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: remove, addRules: add });
          reply({ ok: true });
        } catch (e) { reply({ error: e.message }); }
        break;
      }
      case MSG.BOUNCE: {
        if (!validateMessage(msg, MESSAGE_SCHEMAS[MSG.BOUNCE]) || !isValidDestination(msg.dest)) {
          reply({ error: "invalid BOUNCE parameters" }); return;
        }
        const tabId = sender.tab?.id;
        if (tabId) { await chrome.tabs.update(tabId, { url: msg.dest }); await inc(tabId, "bounces"); }
        reply({ ok: true });
        break;
      }
      case "AMP_REDIRECT": {
        if (msg.canonical && typeof msg.canonical === "string" && msg.canonical.length < 4096 && isValidDestination(msg.canonical) && sender.tab?.id) {
          await chrome.tabs.update(sender.tab.id, { url: msg.canonical });
        }
        reply({ ok: true });
        break;
      }
      case "LEARNING_SIGNALS": {
        const tabId = sender.tab?.id;
        if (tabId && Array.isArray(msg.signals) && msg.signals.length && typeof msg.url === "string" && msg.url.length < 4096) {
          handleLearningSignals(tabId, msg.signals, msg.url).catch(() => {});
        }
        reply({ ok: true });
        break;
      }
      case MSG.SECURITY_ALERT: {
        if (!validateMessage(msg, MESSAGE_SCHEMAS[MSG.SECURITY_ALERT])) { reply({ error: "invalid SECURITY_ALERT parameters" }); return; }
        if (sender.tab?.id) pushLog(sender.tab.id, { url: msg.url || "", ruleId: 0, rs: "security", t: Date.now(), alertType: msg.alertType }).catch(() => {});
        reply({ ok: true });
        break;
      }
      default: reply({ error: "unknown message type" });
    }
  })();
  return true;
});
