/**
 * Minimal pure utilities.
 */

export function hostname(url) {
  try { return new URL(url).hostname; } catch { return ""; }
}

export function isBrowser(url) {
  return !url || /^((chrome|edge|brave|about|chrome-extension|moz-extension):\/\/)/.test(url);
}

export function normHost(h) {
  return (h || "").replace(/^www\./, "").toLowerCase();
}

export function seed() {
  const a = new Uint8Array(4);
  crypto.getRandomValues(a);
  return Array.from(a, b => b.toString(16).padStart(2, "0")).join("");
}

export function rand(seedStr, n = 0) {
  let s = 0;
  for (let i = 0; i < seedStr.length; i++) s = (s * 31 + seedStr.charCodeAt(i)) >>> 0;
  s = (s + n) >>> 0;
  s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
  return (s >>> 0) / 4294967296;
}

export function merge(base, over) {
  const r = { ...base };
  for (const k in over) {
    const v = over[k];
    r[k] = v !== null && typeof v === "object" && !Array.isArray(v)
      ? merge(base[k], v) : v;
  }
  return r;
}
