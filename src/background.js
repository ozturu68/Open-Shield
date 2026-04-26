/**
 * openShield Background Service Worker
 * Hardened, optimized, security-first architecture.
 */

import { DEFAULT_SETTINGS, FP_NOISE_FACTORS, KEY, SESSION, MSG, BOUNCE_DOMAINS } from "./config.js";
import { hostname, isBrowser, normHost, seed, merge } from "./utils.js";

const ALLOW_BASE = 100_000;
const LOG_MAX = 80;
const DNR_STATIC_LIMIT = 30_000;
const DNR_DYNAMIC_LIMIT = 5_000;
const logCache = new Map();

const ALLOWED_HOSTS = new Set([
  "easylist.to", "easylist-downloads.adblockplus.org",
  "raw.githubusercontent.com", "filters.adtidy.org",
  "chromium.googlesource.com"
]);

// ── Farbling (self-contained for executeScript) ──
function installFarbling(seed, factor) {
  if (window.__osFarble) return;
  window.__osFarble = true;

  const prng = (() => {
    let s = 0;
    for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296); };
  })();

  const toStr = Function.prototype.toString;
  const wrapped = [];

  function wrap(proto, name, handler) {
    const d = Object.getOwnPropertyDescriptor(proto, name);
    if (!d || typeof d.value !== "function") return;
    const orig = d.value;
    const fn = function (...a) { return handler(orig, this, a, prng); };
    Object.defineProperty(fn, "name", { value: name });
    Object.defineProperty(proto, name, { value: fn, writable: true, enumerable: d.enumerable, configurable: true });
    wrapped.push(fn);
  }

  function noiseCanvas(b64, rng) {
    try {
      const pre = "data:image/png;base64,";
      if (!b64.startsWith(pre)) return b64;
      const bin = atob(b64.slice(pre.length));
      const u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      const st = Math.min(64, u.length);
      const mut = Math.max(1, Math.round((u.length >> 13) * factor));
      for (let m = 0; m < mut; m++) { const i = st + (rng() * (u.length - st) | 0); u[i] ^= 1; }
      let out = "";
      for (let i = 0; i < u.length; i++) out += String.fromCharCode(u[i]);
      return pre + btoa(out);
    } catch { return b64; }
  }

  wrap(HTMLCanvasElement.prototype, "toDataURL", (o, t, a, rng) => noiseCanvas(o.apply(t, a), rng));
  wrap(HTMLCanvasElement.prototype, "toBlob", (o, t, a, rng) => {
    const cb = a[0];
    a[0] = blob => {
      if (!blob?.type?.includes("png")) { cb(blob); return; }
      const r = new FileReader();
      r.onloadend = () => { fetch(noiseCanvas(r.result, rng)).then(r => r.blob()).then(b => cb(b)).catch(() => cb(blob)); };
      r.readAsDataURL(blob);
    };
    return o.apply(t, a);
  });
  wrap(CanvasRenderingContext2D.prototype, "getImageData", (o, t, a, rng) => {
    const d = o.apply(t, a);
    if (d?.data) { const mut = Math.max(1, Math.round((d.data.length >> 12) * factor)); for (let m = 0; m < mut; m++) d.data[rng() * d.data.length | 0] ^= 1; }
    return d;
  });
  wrap(CanvasRenderingContext2D.prototype, "measureText", (o, t, a, rng) => {
    const r = o.apply(t, a);
    if (r) r.width += (rng() - 0.5) * factor;
    return r;
  });

  const GL_SPOOF = { 37445: "WebKit", 37446: "WebKit WebGL" };
  [WebGLRenderingContext, WebGL2RenderingContext].forEach(P => {
    if (!P) return;
    wrap(P.prototype, "getParameter", (o, t, a) => GL_SPOOF[a[0]] ?? o.apply(t, a));
    wrap(P.prototype, "readPixels", (o, t, a, rng) => { o.apply(t, a); const p = a[6]; if (p?.length) { const mut = Math.max(1, p.length >> 12); for (let m = 0; m < mut; m++) p[rng() * p.length | 0] ^= 1; } });
  });

  wrap(AudioBuffer.prototype, "getChannelData", (o, t, a, rng) => {
    const d = o.apply(t, a);
    if (d?.length) for (let i = 0; i < d.length; i++) d[i] += (rng() - 0.5) * 0.0001 * factor;
    return d;
  });

  ["getFloatFrequencyData", "getByteFrequencyData"].forEach(n => {
    wrap(AnalyserNode.prototype, n, (o, t, a, rng) => {
      const r = o.apply(t, a);
      const arr = a[0];
      if (arr?.length) { for (let i = 0; i < arr.length; i++) arr[i] = n === "getByteFrequencyData" ? Math.max(0, Math.min(255, arr[i] + (rng() > 0.5 ? Math.round(factor) : -Math.round(factor)))) : arr[i] + (rng() - 0.5) * 0.0001 * factor; }
      return r;
    });
  });

  // Font API farbling
  if (document.fonts?.check) {
    const origCheck = document.fonts.check.bind(document.fonts);
    document.fonts.check = function(font, text) {
      const r = origCheck(font, text);
      // Always claim fonts are available to reduce font fingerprinting
      return true;
    };
  }

  // toString deception
  Object.defineProperty(Function.prototype, "toString", {
    value: function toString() { return wrapped.includes(this) ? `function ${this.name}() { [native code] }` : toStr.call(this); },
    writable: true, configurable: true
  });
}

// ── WebRTC Leak Prevention (self-contained) ──
function installWebRTCBlock() {
  if (window.__osWebRTC) return;
  window.__osWebRTC = true;
  const orig = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
  if (!orig) return;

  function isPrivateIPv4(ip) {
    if (!ip || ip.includes(":")) return false;
    const parts = ip.split(".");
    if (parts.length !== 4) return false;
    const b0 = parseInt(parts[0], 10), b1 = parseInt(parts[1], 10);
    if (b0 === 10) return true;
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
    if (b0 === 192 && b1 === 168) return true;
    if (b0 === 127) return true;
    if (b0 === 0) return true;
    return false;
  }

  function isPrivateIPv6(ip) {
    if (!ip || !ip.includes(":")) return false;
    const lower = ip.toLowerCase();
    if (lower.startsWith("fe80:")) return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (lower === "::1" || lower.startsWith("::1%")) return true;
    return false;
  }

  function Wrapped(...args) {
    const pc = new orig(...args);
    const origGetStats = pc.getStats.bind(pc);
    pc.getStats = function(selector) {
      return origGetStats(selector).then(report => {
        const filtered = new Map();
        report.forEach((stat, id) => {
          if (stat.type === "local-candidate" || stat.type === "remote-candidate") {
            const ip = stat.ip || stat.address;
            if (ip && (isPrivateIPv4(ip) || isPrivateIPv6(ip))) return;
            filtered.set(id, stat);
            return;
          }
          filtered.set(id, stat);
        });
        return filtered;
      });
    };
    return pc;
  }
  Object.setPrototypeOf(Wrapped, orig);
  Wrapped.prototype = orig.prototype;
  for (const key of Object.keys(orig)) try { Wrapped[key] = orig[key]; } catch {}
  window.RTCPeerConnection = Wrapped;
  if (window.webkitRTCPeerConnection) window.webkitRTCPeerConnection = Wrapped;
  if (window.mozRTCPeerConnection) window.mozRTCPeerConnection = Wrapped;
}

// ── Beacon Blocker (self-contained) ──
function installBeaconBlock() {
  if (window.__osBeacon) return;
  window.__osBeacon = true;
  if (navigator.sendBeacon) {
    navigator.sendBeacon = function() { return false; };
    try { Object.defineProperty(navigator, "sendBeacon", { value: navigator.sendBeacon, writable: false, configurable: false }); } catch {}
  }
  const origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function(url, options) {
      if (options && options.keepalive) return Promise.resolve(new Response(null, { status: 204 }));
      return origFetch.apply(this, arguments);
    };
  }
  const origXhr = window.XMLHttpRequest;
  if (origXhr) {
    const origOpen = origXhr.prototype.open;
    origXhr.prototype.open = function(method, url) { if (url && String(url).endsWith("/ping")) this.__osBlocked = true; return origOpen.apply(this, arguments); };
    const origSend = origXhr.prototype.send;
    origXhr.prototype.send = function() { if (this.__osBlocked) return; return origSend.apply(this, arguments); };
  }
}

// ── Initialization ──
async function initDefaults() {
  const s = await chrome.storage.local.get([KEY.GLOBAL, KEY.SITES]);
  const g = merge(DEFAULT_SETTINGS, s[KEY.GLOBAL] || {});
  await chrome.storage.local.set({ [KEY.GLOBAL]: g, [KEY.SITES]: s[KEY.SITES] || {} });
  setupFilterAlarm();
}
chrome.runtime.onInstalled.addListener(() => { initDefaults().catch(() => {}); runFilterUpdates().catch(() => {}); });
chrome.runtime.onStartup?.addListener(() => { initDefaults().catch(() => {}); runFilterUpdates().catch(() => {}); });

// ── Settings ──
async function effective(h) {
  const s = await chrome.storage.local.get([KEY.GLOBAL, KEY.SITES]);
  const g = merge(DEFAULT_SETTINGS, s[KEY.GLOBAL] || {});
  const site = (s[KEY.SITES] || {})[h] || {};
  if (site.shields === false) {
    return { ...g, shields: false, ads: "off", fp: false, https: false, cookies: "off", bounce: false, params: false, cosmetic: false };
  }
  return merge(g, site);
}

// ── Counters ──
async function counters(tabId) {
  const s = await chrome.storage.session.get(SESSION.COUNTERS);
  return (s[SESSION.COUNTERS] || {})[tabId] || { blocked: 0, upgraded: 0, bounces: 0 };
}
async function inc(tabId, field) {
  const s = await chrome.storage.session.get(SESSION.COUNTERS);
  const all = s[SESSION.COUNTERS] || {};
  all[tabId] = all[tabId] || { blocked: 0, upgraded: 0, bounces: 0 };
  all[tabId][field] = (all[tabId][field] || 0) + 1;
  await chrome.storage.session.set({ [SESSION.COUNTERS]: all });
  const t = all[tabId].blocked + all[tabId].upgraded;
  chrome.action.setBadgeText({ tabId, text: t > 99 ? "99+" : t > 0 ? String(t) : "" }).catch(() => {});
  chrome.action.setBadgeBackgroundColor({ tabId, color: "#E07B00" }).catch(() => {});
}

// ── Block log ──
async function pushLog(tabId, entry) {
  let l = logCache.get(tabId);
  if (!l) { const s = await chrome.storage.session.get(SESSION.LOG); l = (s[SESSION.LOG] || {})[tabId] || []; }
  l.push(entry);
  if (l.length > LOG_MAX) l = l.slice(-LOG_MAX);
  logCache.set(tabId, l);
  const s = await chrome.storage.session.get(SESSION.LOG);
  const all = s[SESSION.LOG] || {}; all[tabId] = l;
  await chrome.storage.session.set({ [SESSION.LOG]: all });
}
async function getLog(tabId) {
  let l = logCache.get(tabId);
  if (!l) { const s = await chrome.storage.session.get(SESSION.LOG); l = (s[SESSION.LOG] || {})[tabId] || []; logCache.set(tabId, l); }
  return l;
}

// ── DNR match listener ──
if (chrome.declarativeNetRequest?.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(info => {
    const tabId = info.tabId;
    if (!tabId || tabId < 0) return;
    const rs = info.rule?.rulesetId || "";
    const cat = rs === "https_upgrade" ? "upgraded" : "blocked";
    inc(tabId, cat).catch(() => {});
    pushLog(tabId, { url: info.request?.url || "", ruleId: info.rule?.ruleId || 0, rs, t: Date.now() }).catch(() => {});
  });
}

// ── Tab lifecycle ──
chrome.tabs.onRemoved.addListener(tabId => { autoShred(tabId).catch(() => {}); logCache.delete(tabId); });
chrome.tabs.onUpdated.addListener((tabId, ch, tab) => {
  if (ch.url && tab.url) {
    try {
      const o = new URL(tab.url).origin;
      chrome.storage.session.get(SESSION.ORIGINS).then(r => { const a = r[SESSION.ORIGINS] || {}; a[tabId] = o; return chrome.storage.session.set({ [SESSION.ORIGINS]: a }); }).catch(() => {});
    } catch {}
  }
  if (ch.status === "loading" || ch.status === "complete") inc(tabId, null).catch(() => {});
});

async function autoShred(tabId) {
  const s = await chrome.storage.local.get(KEY.GLOBAL);
  if (!s[KEY.GLOBAL]?.shred) return;
  const r = await chrome.storage.session.get(SESSION.ORIGINS);
  const o = (r[SESSION.ORIGINS] || {})[tabId];
  if (!o) return;
  await chrome.browsingData.remove({ origins: [o] }, { cookies: true, localStorage: true, cacheStorage: true, indexedDB: true, serviceWorkers: true });
  const a = r[SESSION.ORIGINS] || {}; delete a[tabId];
  await chrome.storage.session.set({ [SESSION.ORIGINS]: a });
}

// ── Script injection orchestrator ──
chrome.webNavigation.onCommitted.addListener(d => {
  if (d.frameId !== 0) return;
  if (isBrowser(d.url)) return;
  const h = normHost(hostname(d.url));
  if (!h) return;
  injectAll(d.tabId, h).catch(() => {});
});

async function injectAll(tabId, h) {
  if (!isValidHostname(h) || isBrowser(h)) return;
  const cfg = await effective(h);

  const shieldsActive = cfg.shields !== false;
  if (!shieldsActive) return;

  // Farbling
  if (cfg.fp) {
    const s = await chrome.storage.session.get(SESSION.SEEDS);
    const seeds = s[SESSION.SEEDS] || {};
    let sv = seeds[h];
    if (!sv) { sv = seed(); seeds[h] = sv; await chrome.storage.session.set({ [SESSION.SEEDS]: seeds }); }
    const fLevel = cfg.fpLevel || "medium";
    const factor = FP_NOISE_FACTORS[fLevel] || FP_NOISE_FACTORS.medium;
    await chrome.scripting.executeScript({ target: { tabId }, world: "MAIN", func: installFarbling, args: [sv, factor], injectImmediately: true });
  }

  // WebRTC IP leak prevention
  if (cfg.fp) {
    await chrome.scripting.executeScript({ target: { tabId }, world: "MAIN", func: installWebRTCBlock, injectImmediately: true });
  }

  // Beacon/ping blocking
  if (cfg.fp) {
    await chrome.scripting.executeScript({ target: { tabId }, world: "MAIN", func: installBeaconBlock, injectImmediately: true });
  }
}

// ── Bounce tracking ──
chrome.webNavigation.onBeforeNavigate.addListener(d => {
  if (d.frameId !== 0) return;
  const h = normHost(hostname(d.url));
  if (!h || !BOUNCE_DOMAINS.includes(h)) return;
  try {
    const u = new URL(d.url);
    const dest = u.searchParams.get("u") || u.searchParams.get("url") || u.searchParams.get("next") || u.searchParams.get("target");
    if (!dest) return;
    let decoded;
    try { decoded = decodeURIComponent(dest); } catch { return; }
    if (!/^https?:\/\//i.test(decoded)) return;
    const parsed = new URL(decoded);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return;
    if (parsed.hostname === h) return;
    chrome.tabs.update(d.tabId, { url: decoded }).catch(() => {});
    inc(d.tabId, "bounces").catch(() => {});
  } catch {}
});

// ── Dynamic DNR ──
function allowId(h) { let hash = 0; for (let i = 0; i < h.length; i++) hash = (hash * 31 + h.charCodeAt(i)) >>> 0; return ALLOW_BASE + (hash % 50_000); }

async function setShields(h, on) {
  const id = allowId(h);
  if (on) {
    try { await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [id] }); } catch {}
  } else {
    const rule = { id, priority: 999, action: { type: "allow" }, condition: { initiatorDomains: [h], resourceTypes: ["main_frame","sub_frame","script","image","stylesheet","xmlhttprequest","media","font","other"] } };
    try { await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [id], addRules: [rule] }); } catch {}
  }
}

// ── DNR Rule Limit Monitoring ──
async function checkDNRQuota() {
  try {
    const statics = await chrome.declarativeNetRequest.getEnabledRulesets();
    const dynamics = await chrome.declarativeNetRequest.getDynamicRules();
    const staticCount = statics?.reduce((sum, rs) => sum + (rs.rulesCount || 0), 0) || 0;
    const dynamicCount = dynamics?.length || 0;

    if (staticCount > DNR_STATIC_LIMIT * 0.85) {
      console.warn(`[openShield] Static DNR rules at ${staticCount}/${DNR_STATIC_LIMIT} (${Math.round(staticCount / DNR_STATIC_LIMIT * 100)}%)`);
    }
    if (dynamicCount > DNR_DYNAMIC_LIMIT * 0.85) {
      console.warn(`[openShield] Dynamic DNR rules at ${dynamicCount}/${DNR_DYNAMIC_LIMIT} (${Math.round(dynamicCount / DNR_DYNAMIC_LIMIT * 100)}%)`);
    }
    return { staticCount, dynamicCount };
  } catch { return { staticCount: 0, dynamicCount: 0 }; }
}

// ── Auto-Update Filter Lists ──
const ALARM_FILTER_UPDATE = "filterUpdate";
const FILTER_META_KEY = "filterMeta";
const MAX_PER_LIST = 4000;

const FILTER_ID_RANGES = {
  "ublock-filters":   { start: 10_000, end: 19_999 },
  "ublock-privacy":   { start: 20_000, end: 29_999 },
  "adguard-base":     { start: 30_000, end: 39_999 },
  "adguard-tracking": { start: 40_000, end: 49_999 }
};

function idRangeFor(sourceId) {
  return FILTER_ID_RANGES[sourceId] || { start: 50_000, end: 59_999 };
}

function isValidSourceURL(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return ALLOWED_HOSTS.has(u.hostname);
  } catch { return false; }
}

function abpLineToDNR(line, id) {
  line = line.trim();
  if (!line || line.startsWith("!") || line.startsWith("[")) return null;
  if (line.includes("##") || line.includes("#@#") || line.includes("#?#")) return null;

  const isException = line.startsWith("@@");
  if (isException) line = line.slice(2);

  const optIdx = line.lastIndexOf("$");
  let rulePart = line;
  let optStr = "";
  if (optIdx > 0) {
    rulePart = line.slice(0, optIdx);
    optStr = line.slice(optIdx + 1);
  }

  const opts = {};
  if (optStr) {
    optStr.split(",").forEach(p => {
      const eq = p.indexOf("=");
      opts[p.slice(0, eq === -1 ? p.length : eq).trim()] = eq === -1 ? true : p.slice(eq + 1).trim();
    });
  }

  if (opts.csp || opts.redirect || opts.removeparam || opts.redirectrule) return null;

  const condition = {};

  if (rulePart.startsWith("||")) {
    condition.urlFilter = rulePart;
  } else if (rulePart.startsWith("/") && rulePart.endsWith("/")) {
    condition.regexFilter = rulePart.slice(1, -1);
  } else if (rulePart.includes("*") || rulePart.includes("^")) {
    condition.urlFilter = rulePart;
  } else {
    condition.urlFilter = rulePart;
  }

  const typeMap = { script: "script", image: "image", stylesheet: "stylesheet", xmlhttprequest: "xmlhttprequest", font: "font", media: "media", subdocument: "sub_frame", websocket: "websocket", ping: "ping", other: "other", popup: "main_frame", document: "main_frame" };
  const types = [];
  for (const [k, v] of Object.entries(typeMap)) {
    if (opts[k]) types.push(v);
  }
  if (types.length) condition.resourceTypes = types;

  if (opts["third-party"]) condition.domainType = "thirdParty";
  if (opts["first-party"]) condition.domainType = "firstParty";

  if (opts.domain) {
    const ds = opts.domain.split("|").map(d => d.trim());
    const incl = ds.filter(d => d && !d.startsWith("~"));
    const excl = ds.filter(d => d.startsWith("~")).map(d => d.slice(1));
    if (incl.length) condition.initiatorDomains = incl;
    if (excl.length) condition.excludedInitiatorDomains = excl;
  }

  return { id, priority: isException ? 2 : 1, action: { type: isException ? "allow" : "block" }, condition };
}

function ruleKey(rule) {
  return rule.condition.urlFilter || rule.condition.regexFilter || "";
}

async function refreshFilterList(source) {
  if (!isValidSourceURL(source.url)) return 0;
  try {
    const res = await fetch(source.url, { signal: AbortSignal.timeout(45_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const lines = text.split(/\r?\n/);
    const range = idRangeFor(source.id);
    let id = range.start;
    const newRules = [];
    const seen = new Set();

    for (const line of lines) {
      if (newRules.length >= MAX_PER_LIST || id > range.end) break;
      const rule = abpLineToDNR(line, id);
      if (!rule) continue;
      const key = ruleKey(rule);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      newRules.push(rule);
      id++;
    }

    const storedMeta = await chrome.storage.local.get(FILTER_META_KEY);
    const meta = storedMeta[FILTER_META_KEY] || {};
    const prevIds = meta[source.id] || [];

    // Diff: compute rules to add vs. remove
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingMap = new Map();
    const existingIds = new Set();
    for (const r of existingRules) {
      const key = ruleKey(r);
      if (key) existingMap.set(key, r.id);
      if (prevIds.includes(r.id)) existingIds.add(r.id);
    }

    const toRemove = [];
    const toAdd = [];

    for (const prevId of prevIds) {
      if (existingIds.has(prevId)) toRemove.push(prevId);
    }

    const newKeys = new Set();
    for (const rule of newRules) {
      const key = ruleKey(rule);
      newKeys.add(key);
      if (!existingMap.has(key)) {
        toAdd.push(rule);
      }
    }

    if (toRemove.length > 0 || toAdd.length > 0) {
      try {
        await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: toRemove, addRules: toAdd });
      } catch (e) {
        console.warn(`[openShield] Dynamic rule update failed for ${source.name}:`, e.message);
      }
    }

    meta[source.id] = newRules.map(r => r.id);
    meta[`${source.id}_updated`] = Date.now();
    await chrome.storage.local.set({ [FILTER_META_KEY]: meta });

    return newRules.length;
  } catch (e) {
    console.warn(`[openShield] Filter refresh failed for ${source.name}:`, e.message);
    return -1;
  }
}

async function runFilterUpdates() {
  const sources = [
    { id: "ublock-filters", name: "uBlock Origin Filters", url: "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt" },
    { id: "ublock-privacy", name: "uBlock Origin Privacy", url: "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt" },
    { id: "adguard-base", name: "AdGuard Base", url: "https://filters.adtidy.org/extension/chromium/filters/2.txt" },
    { id: "adguard-tracking", name: "AdGuard Tracking", url: "https://filters.adtidy.org/extension/chromium/filters/3.txt" }
  ];

  for (const source of sources) {
    const result = await refreshFilterList(source);
    if (result >= 0) console.log(`[openShield] Updated ${source.name}: ${result} rules`);
  }
  await checkDNRQuota();
}

function setupFilterAlarm() {
  chrome.alarms.create(ALARM_FILTER_UPDATE, { periodInMinutes: 5760 });
}

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM_FILTER_UPDATE) {
    runFilterUpdates().catch(() => {});
  }
});

// ── Message router ──
const ALLOWED_SITE_KEYS = new Set(["shields", "ads", "fp", "fpLevel", "https", "cookies", "bounce", "params", "cosmetic", "shred"]);
const ALLOWED_GLOBAL_KEYS = new Set(["ads", "fp", "fpLevel", "https", "cookies", "bounce", "params", "cosmetic", "shred"]);

function isValidHostname(h) {
  return typeof h === "string" && h.length > 0 && h.length < 256 && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(h);
}

function isValidDestination(dest) {
  if (typeof dest !== "string" || dest.length > 4096) return false;
  try {
    const u = new URL(dest);
    return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.length > 0;
  } catch { return false; }
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => {
    switch (msg.type) {
      case MSG.GET_STATE: {
        if (typeof msg.tabId !== "number") { reply({ error: "invalid tabId" }); return; }
        const tab = await chrome.tabs.get(msg.tabId);
        const h = normHost(hostname(tab.url || ""));
        const cfg = h ? await effective(h) : { ...DEFAULT_SETTINGS };
        reply({ h, cfg, counts: await counters(msg.tabId) });
        break;
      }
      case MSG.SET_SITE: {
        if (!isValidHostname(msg.h) || !ALLOWED_SITE_KEYS.has(msg.k)) { reply({ error: "invalid parameters" }); return; }
        const s = await chrome.storage.local.get(KEY.SITES);
        const sites = s[KEY.SITES] || {};
        sites[msg.h] = sites[msg.h] || {};
        sites[msg.h][msg.k] = msg.v;
        if (msg.k === "shields") await setShields(msg.h, msg.v !== false);
        await chrome.storage.local.set({ [KEY.SITES]: sites });
        reply({ ok: true });
        break;
      }
      case MSG.SET_GLOBAL: {
        if (!ALLOWED_GLOBAL_KEYS.has(msg.k)) { reply({ error: "invalid key" }); return; }
        const s = await chrome.storage.local.get(KEY.GLOBAL);
        const g = s[KEY.GLOBAL] || {};
        g[msg.k] = msg.v;
        await chrome.storage.local.set({ [KEY.GLOBAL]: g });
        reply({ ok: true });
        break;
      }
      case MSG.GET_LOG: reply({ log: await getLog(msg.tabId) }); break;
      case MSG.BOUNCE: {
        const tabId = sender.tab?.id;
        if (tabId && msg.dest && isValidDestination(msg.dest)) { await chrome.tabs.update(tabId, { url: msg.dest }); await inc(tabId, "bounces"); }
        reply({ ok: true });
        break;
      }
      default: reply({ error: "unknown" });
    }
  })();
  return true;
});

// ── Icon state ──
async function setIcon(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    const h = normHost(hostname(tab.url || ""));
    const browser = isBrowser(tab.url);
    let prefix = browser || !h ? "shield-partial" : (await effective(h)).shields !== false ? "shield-on" : "shield-off";
    await chrome.action.setIcon({ tabId, path: { 16: `icons/${prefix}-16.png`, 32: `icons/${prefix}-32.png`, 48: `icons/${prefix}-48.png`, 128: `icons/${prefix}-128.png` } });
  } catch {}
}
chrome.tabs.onActivated.addListener(({ tabId }) => setIcon(tabId).catch(() => {}));
chrome.tabs.onUpdated.addListener((tabId, ch) => { if (ch.url || ch.status === "complete") setIcon(tabId).catch(() => {}); });
