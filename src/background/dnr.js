/**
 * DNR (declarativeNetRequest) rule management.
 * Rule ID ranges:
 *   100,000–149,999  Per-site shields toggle (allow)
 *   150,000–199,999  Allowlist
 *   200,000–249,999  Selective JS blocking
 *   300,000–309,999  Cohort auto-block
 */
import { KEY, ALLOW_BASE, JS_BLOCK_BASE, COHORT_DNR_START, DNR_STATIC_LIMIT, DNR_DYNAMIC_LIMIT, SESSION } from "../core/config.js";
import { hashForId } from "../core/utils.js";

export function allowId(h) { return hashForId(h, ALLOW_BASE, 50_000); }
export function jsBlockId(h) { return hashForId(h, JS_BLOCK_BASE, 50_000); }
export function cohortId(domain) { return COHORT_DNR_START + (hashForId(domain, 0, 10_000)); }

export async function setShields(h, on) {
  const id = allowId(h);
  const jsId = jsBlockId(h);
  const toRemove = [id, jsId];
  if (on) {
    try { await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: toRemove }); }
    catch (err) { console.warn("[openShield] setShields removeRules failed:", err?.message || err); }
  } else {
    const rule = { id, priority: 2000, action: { type: "allow" }, condition: { initiatorDomains: [h], resourceTypes: ["main_frame","sub_frame","script","image","stylesheet","xmlhttprequest","media","font","other"] } };
    try { await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: toRemove, addRules: [rule] }); }
    catch (err) { console.warn("[openShield] setShields updateDynamicRules failed:", err?.message || err); }
  }
}

export async function setDynamic3p(h, on) {
  if (on) {
    await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: ["3p-block"] }).catch(() => {});
  } else {
    await chrome.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds: ["3p-block"] }).catch(() => {});
  }
  const s = await chrome.storage.local.get(KEY.SITES);
  const sites = s[KEY.SITES] || {};
  sites[h] = sites[h] || {};
  sites[h].dynamic3p = on;
  await chrome.storage.local.set({ [KEY.SITES]: sites });
}

export async function setJSBlocked(h, blocked) {
  const id = jsBlockId(h);
  if (blocked) {
    const rule = { id, priority: 3000, action: { type: "block" }, condition: { initiatorDomains: [h], resourceTypes: ["script"] } };
    try { await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [id], addRules: [rule] }); }
    catch (err) { console.warn("[openShield] setJSBlocked updateDynamicRules failed:", err?.message || err); }
  } else {
    try { await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [id] }); }
    catch (err) { console.warn("[openShield] setJSBlocked removeRules failed:", err?.message || err); }
  }
  const s = await chrome.storage.local.get(KEY.JS_BLOCKED);
  const blockedSites = s[KEY.JS_BLOCKED] || {};
  blockedSites[h] = blocked;
  await chrome.storage.local.set({ [KEY.JS_BLOCKED]: blockedSites });
}

export async function isJSBlocked(h) {
  const s = await chrome.storage.local.get(KEY.JS_BLOCKED);
  return (s[KEY.JS_BLOCKED] || {})[h] === true;
}

export async function checkDNRQuota() {
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
