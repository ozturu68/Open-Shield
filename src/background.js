/**
 * openShield Background Service Worker
 * Hardened, optimized, security-first architecture.
 */

import { DEFAULT_SETTINGS, KEY, SESSION, MSG, BOUNCE_DOMAINS } from "./config.js";
import { hostname, isBrowser, normHost, seed, merge } from "./utils.js";

const ALLOW_BASE = 100_000;
const LOG_MAX = 80;
const logCache = new Map();

// ── Farbling (self-contained for executeScript) ──
function installFarbling(seed) {
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
      const mut = Math.max(1, u.length >> 13);
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
    if (d?.data) { const mut = Math.max(1, d.data.length >> 12); for (let m = 0; m < mut; m++) d.data[rng() * d.data.length | 0] ^= 1; }
    return d;
  });
  wrap(CanvasRenderingContext2D.prototype, "measureText", (o, t, a, rng) => { const r = o.apply(t, a); if (r) r.width += (rng() - 0.5); return r; });

  const GL_SPOOF = { 37445: "WebKit", 37446: "WebKit WebGL" };
  [WebGLRenderingContext, WebGL2RenderingContext].forEach(P => {
    if (!P) return;
    wrap(P.prototype, "getParameter", (o, t, a) => GL_SPOOF[a[0]] ?? o.apply(t, a));
    wrap(P.prototype, "readPixels", (o, t, a, rng) => { o.apply(t, a); const p = a[6]; if (p?.length) { const mut = Math.max(1, p.length >> 12); for (let m = 0; m < mut; m++) p[rng() * p.length | 0] ^= 1; } });
  });

  wrap(AudioBuffer.prototype, "getChannelData", (o, t, a, rng) => {
    const d = o.apply(t, a);
    if (d?.length) for (let i = 0; i < d.length; i++) d[i] += (rng() - 0.5) * 0.0001;
    return d;
  });

  ["getFloatFrequencyData", "getByteFrequencyData"].forEach(n => {
    wrap(AnalyserNode.prototype, n, (o, t, a, rng) => {
      const r = o.apply(t, a);
      const arr = a[0];
      if (arr?.length) { for (let i = 0; i < arr.length; i++) arr[i] = n === "getByteFrequencyData" ? Math.max(0, Math.min(255, arr[i] + (rng() > 0.5 ? 1 : -1))) : arr[i] + (rng() - 0.5) * 0.0001; }
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
  function Wrapped(...args) {
    const pc = new orig(...args);
    const origGetStats = pc.getStats.bind(pc);
    pc.getStats = function(selector) {
      return origGetStats(selector).then(report => {
        const filtered = new Map();
        report.forEach((stat, id) => {
          if (stat.type === "local-candidate" || stat.type === "remote-candidate") {
            const ip = stat.ip || stat.address;
            if (ip && !ip.includes(":") && !ip.startsWith("192.168.") && !ip.startsWith("10.") && !ip.startsWith("172.")) filtered.set(id, stat);
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
}
chrome.runtime.onInstalled.addListener(() => initDefaults().catch(() => {}));
chrome.runtime.onStartup?.addListener(() => initDefaults().catch(() => {}));

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
  const cfg = await effective(h);

  // Farbling
  if (cfg.fp) {
    const s = await chrome.storage.session.get(SESSION.SEEDS);
    const seeds = s[SESSION.SEEDS] || {};
    let sv = seeds[h];
    if (!sv) { sv = seed(); seeds[h] = sv; await chrome.storage.session.set({ [SESSION.SEEDS]: seeds }); }
    await chrome.scripting.executeScript({ target: { tabId }, world: "MAIN", func: installFarbling, args: [sv], injectImmediately: true });
  }

  // WebRTC block (always inject for security)
  await chrome.scripting.executeScript({ target: { tabId }, world: "MAIN", func: installWebRTCBlock, injectImmediately: true });

  // Beacon block (always inject)
  await chrome.scripting.executeScript({ target: { tabId }, world: "MAIN", func: installBeaconBlock, injectImmediately: true });
}

// ── Bounce tracking ──
chrome.webNavigation.onBeforeNavigate.addListener(d => {
  if (d.frameId !== 0) return;
  const h = normHost(hostname(d.url));
  if (!h || !BOUNCE_DOMAINS.includes(h)) return;
  try {
    const u = new URL(d.url);
    const dest = u.searchParams.get("u") || u.searchParams.get("url") || u.searchParams.get("next") || u.searchParams.get("target");
    if (dest && /^https?:\/\//i.test(decodeURIComponent(dest))) {
      chrome.tabs.update(d.tabId, { url: decodeURIComponent(dest) }).catch(() => {});
      inc(d.tabId, "bounces").catch(() => {});
    }
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

// ── Message router ──
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => {
    switch (msg.type) {
      case MSG.GET_STATE: {
        const tab = await chrome.tabs.get(msg.tabId);
        const h = normHost(hostname(tab.url || ""));
        const cfg = h ? await effective(h) : { ...DEFAULT_SETTINGS };
        reply({ h, cfg, counts: await counters(msg.tabId) });
        break;
      }
      case MSG.SET_SITE: {
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
        if (tabId && msg.dest) { await chrome.tabs.update(tabId, { url: msg.dest }); await inc(tabId, "bounces"); }
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
