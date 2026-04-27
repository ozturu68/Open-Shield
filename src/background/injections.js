/**
 * Self-contained MAIN-world injection functions.
 * These are serialized via chrome.scripting.executeScript and must
 * have NO references to module scope variables.
 */

/**
 * Canvas/WebGL/Audio fingerprinting protection.
 * @param {string} seedVal - 32-char hex seed
 * @param {number} factor - noise multiplier from FP_NOISE_FACTORS
 */
export function installFarbling(seedVal, factor) {
  if (window.__osFarble) return;
  window.__osFarble = true;

  if (factor === Infinity || factor > 100) {
    HTMLCanvasElement.prototype.toDataURL = function() { return "data:image/png;base64,iVBORw0KGgo="; };
    HTMLCanvasElement.prototype.toBlob = function(cb) { cb(new Blob([],{type:"image/png"})); };
    CanvasRenderingContext2D.prototype.getImageData = function() { return new ImageData(1,1); };
    CanvasRenderingContext2D.prototype.measureText = function() { return {width:0}; };
    try { delete window.WebGLRenderingContext; delete window.WebGL2RenderingContext; } catch {}
    return;
  }

  const prng = (() => {
    let s = 0;
    for (let i = 0; i < seedVal.length; i++) s = (s * 31 + seedVal.charCodeAt(i)) >>> 0;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296); };
  })();

  const toStr = Function.prototype.toString;
  const wrapped = new WeakSet();

  function wrap(proto, name, handler) {
    const d = Object.getOwnPropertyDescriptor(proto, name);
    if (!d || typeof d.value !== "function") return;
    const orig = d.value;
    const fn = function (...a) { return handler(orig, this, a, prng); };
    Object.defineProperty(fn, "name", { value: name });
    Object.defineProperty(proto, name, { value: fn, writable: true, enumerable: d.enumerable, configurable: true });
    wrapped.add(fn);
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
      r.onloadend = () => {
        const noised = noiseCanvas(r.result, rng);
        const parts = noised.split(",");
        if (parts.length !== 2) { cb(blob); return; }
        const binary = atob(parts[1]);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        cb(new Blob([bytes], { type: "image/png" }));
      };
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
  if (document.fonts?.check) {
    document.fonts.check = function() { return true; };
  }
  Object.defineProperty(Function.prototype, "toString", {
    value: function() { return wrapped.has(this) ? `function ${this.name}() { [native code] }` : toStr.call(this); },
    writable: true, configurable: true
  });
}

/** WebRTC local IP leak prevention. */
export function installWebRTCBlock() {
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
    return b0 === 0;
  }
  function isPrivateIPv6(ip) {
    if (!ip || !ip.includes(":")) return false;
    const lower = ip.toLowerCase();
    return lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd") || lower === "::1" || lower.startsWith("::1%");
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

/** Blocks navigator.sendBeacon and keepalive fetch requests. */
export function installBeaconBlock() {
  if (window.__osBeacon) return;
  window.__osBeacon = true;
  if (navigator.sendBeacon) {
    navigator.sendBeacon = function() { return false; };
    try { Object.defineProperty(navigator, "sendBeacon", { value: navigator.sendBeacon, writable: false, configurable: false }); } catch {}
  }
  const origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function(url, options) {
      if (options && options.keepalive) return Promise.resolve(new Response(void 0, { status: 204 }));
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

/** MAIN-world learning observer — detects tracker behavior patterns. */
export function installLearningObserver() {
  if (window.__osLearning) return;
  window.__osLearning = true;
  const signals = [];
  try {
    const desc = Object.getOwnPropertyDescriptor(Document.prototype, "cookie") || Object.getOwnPropertyDescriptor(HTMLDocument.prototype, "cookie");
    if (desc?.set) {
      const origSet = desc.set;
      Object.defineProperty(document, "cookie", {
        get: desc.get,
        set: function(v) { signals.push({ type: "thirdPartyCookie", t: Date.now() }); return origSet.call(this, v); },
        configurable: true
      });
    }
  } catch {}
  try {
    const origSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(k, v) {
      signals.push({ type: "localStorage", t: Date.now() });
      return origSetItem.call(this, k, v);
    };
  } catch {}
  const watchProps = ["userAgent","platform","language","hardwareConcurrency","deviceMemory","maxTouchPoints"];
  watchProps.forEach(prop => {
    try {
      const desc = Object.getOwnPropertyDescriptor(Navigator.prototype, prop);
      if (desc?.get) {
        const origGet = desc.get;
        Object.defineProperty(Navigator.prototype, prop, {
          get: function() { signals.push({ type: "navigatorProbe", prop, t: Date.now() }); return origGet.call(this); },
          configurable: true
        });
      }
    } catch {}
  });

  let lastReport = 0;
  const origSetTimeout = window.setTimeout;
  origSetTimeout(function report() {
    if (signals.length > 0 && Date.now() - lastReport > 3000) {
      lastReport = Date.now();
      const batch = signals.splice(0, signals.length);
      try { chrome?.runtime?.sendMessage({ type: "LEARNING_SIGNALS", signals: JSON.parse(JSON.stringify(batch)), url: location.href }).catch(() => {}); } catch {}
    }
    origSetTimeout(report, 2000);
  }, 2000);
}

/** Injects Global Privacy Control and Do Not Track signals. */
export function installGPC() {
  if (window.__osGPC) return;
  window.__osGPC = true;
  try {
    Object.defineProperty(navigator, "globalPrivacyControl", { get: function() { return true; }, configurable: true, enumerable: true });
    Object.defineProperty(navigator, "doNotTrack", { get: function() { return "1"; }, configurable: true, enumerable: true });
  } catch {}
}

/**
 * Consolidated injection: GPC + Farbling + WebRTC + Beacon in one call.
 * @param {string} seedVal - 32-char hex seed (null to skip farbling)
 * @param {number} factor - noise multiplier
 * @param {boolean} enableLearning - install learning observer
 */
export function installAll(seedVal, factor, enableLearning) {
  if (window.__osAllInstalled) return;
  window.__osAllInstalled = true;

  installGPC();

  if (seedVal) {
    installFarbling(seedVal, factor);
    installWebRTCBlock();
    installBeaconBlock();
  }

  if (enableLearning) {
    installLearningObserver();
  }
}
