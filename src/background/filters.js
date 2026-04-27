/**
 * ABP→DNR filter conversion and filter update system.
 */
import { KEY, FILTER_META_KEY, ALARM_FILTER_UPDATE, MAX_PER_LIST, ALLOWED_HOSTS, FILTER_ID_RANGES, FILTER_FETCH_TIMEOUT_MS, FILTER_UPDATE_INTERVAL_MIN } from "../core/config.js";
import { isValidSourceURL } from "../core/utils.js";

function idRangeFor(sourceId) {
  return FILTER_ID_RANGES[sourceId] || FILTER_ID_RANGES.__fallback;
}

/**
 * Converts a single ABP filter line to a DNR rule.
 * @param {string} line
 * @param {number} id
 * @returns {object|null}
 */
export function abpLineToDNR(line, id) {
  line = line.trim();
  if (!line || line.startsWith("!") || line.startsWith("[")) return null;
  if (line.includes("##") || line.includes("#@#") || line.includes("#?#")) return null;

  const isException = line.startsWith("@@");
  if (isException) line = line.slice(2);

  const optIdx = line.lastIndexOf("$");
  let rulePart = line, optStr = "";
  if (optIdx > 0) { rulePart = line.slice(0, optIdx); optStr = line.slice(optIdx + 1); }

  const opts = {};
  if (optStr) optStr.split(",").forEach(p => { const eq = p.indexOf("="); opts[p.slice(0, eq === -1 ? p.length : eq).trim()] = eq === -1 ? true : p.slice(eq + 1).trim(); });

  if (opts.csp || opts.redirect || opts.removeparam || opts.redirectrule) return null;

  const condition = {};
  if (rulePart.startsWith("||")) condition.urlFilter = rulePart;
  else if (rulePart.startsWith("/") && rulePart.endsWith("/")) condition.regexFilter = rulePart.slice(1, -1);
  else if (rulePart.includes("*") || rulePart.includes("^")) condition.urlFilter = rulePart;
  else condition.urlFilter = rulePart;

  const typeMap = { script: "script", image: "image", stylesheet: "stylesheet", xmlhttprequest: "xmlhttprequest", font: "font", media: "media", subdocument: "sub_frame", websocket: "websocket", ping: "ping", other: "other", popup: "main_frame", document: "main_frame" };
  const types = [];
  for (const [k, v] of Object.entries(typeMap)) { if (opts[k]) types.push(v); }
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

/**
 * Unique key for DNR rule deduplication.
 * @param {object} rule
 * @returns {string}
 */
export function ruleKey(rule) {
  return rule.condition.urlFilter || rule.condition.regexFilter || "";
}

async function refreshFilterList(source) {
  if (!isValidSourceURL(source.url, ALLOWED_HOSTS)) return 0;
  try {
    const res = await fetch(source.url, { signal: AbortSignal.timeout(FILTER_FETCH_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const lines = text.split(/\r?\n/);
    const range = idRangeFor(source.id);
    let id = range.start;
    const newRules = [], seen = new Set();
    for (const line of lines) {
      if (newRules.length >= MAX_PER_LIST || id > range.end) break;
      const rule = abpLineToDNR(line, id);
      if (!rule) continue;
      const key = ruleKey(rule);
      if (!key || seen.has(key)) continue;
      seen.add(key); newRules.push(rule); id++;
    }
    const storedMeta = await chrome.storage.local.get(FILTER_META_KEY);
    const meta = storedMeta[FILTER_META_KEY] || {};
    const prevIds = meta[source.id] || [];
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingMap = new Map(), existingIds = new Set();
    for (const r of existingRules) { const key = ruleKey(r); if (key) existingMap.set(key, r.id); if (prevIds.includes(r.id)) existingIds.add(r.id); }
    const toRemove = [], toAdd = [];
    for (const prevId of prevIds) { if (existingIds.has(prevId)) toRemove.push(prevId); }
    const newKeys = new Set();
    for (const rule of newRules) { const key = ruleKey(rule); newKeys.add(key); if (!existingMap.has(key)) toAdd.push(rule); }
    if (toRemove.length > 0 || toAdd.length > 0) {
      try { await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: toRemove, addRules: toAdd }); }
      catch (e) { console.warn(`[openShield] Dynamic rule update failed for ${source.name}:`, e.message); }
    }
    meta[source.id] = newRules.map(r => r.id);
    meta[`${source.id}_updated`] = Date.now();
    await chrome.storage.local.set({ [FILTER_META_KEY]: meta });
    return newRules.length;
  } catch (e) { console.warn(`[openShield] Filter refresh failed for ${source.name}:`, e.message); return -1; }
}

export { refreshFilterList };

export async function runFilterUpdates(checkDNRQuota) {
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
  if (checkDNRQuota) await checkDNRQuota();
}

export function setupFilterAlarm() {
  chrome.alarms.create(ALARM_FILTER_UPDATE, { periodInMinutes: FILTER_UPDATE_INTERVAL_MIN });
}
