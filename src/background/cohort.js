/**
 * Cohort Tracking Database — Privacy Badger style heuristic tracker detection.
 * Records third-party domains seen across first-party sites.
 * Auto-blocks when a domain appears on COHORT_THRESHOLD distinct sites.
 */
import { KEY, COHORT_THRESHOLD, MAX_SITES_PER_COHORT, COHORT_CLEANUP_DAYS, ALARM_COHORT_CLEANUP } from "../core/config.js";
import { normHost, hostname } from "../core/utils.js";
import { cohortId } from "./dnr.js";
import { inc } from "./settings.js";

export async function recordThirdParty(tabId, thirdPartyDomain) {
  if (!thirdPartyDomain) return;
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab?.url) return;
  const firstParty = normHost(hostname(tab.url));
  if (!firstParty || firstParty === thirdPartyDomain) return;

  const s = await chrome.storage.local.get(KEY.COHORT);
  const db = s[KEY.COHORT] || {};
  if (!db[thirdPartyDomain]) db[thirdPartyDomain] = { sites: {}, firstSeen: Date.now(), autoBlocked: false };
  db[thirdPartyDomain].sites[firstParty] = Date.now();
  db[thirdPartyDomain].lastSeen = Date.now();

  if (Object.keys(db[thirdPartyDomain].sites).length > MAX_SITES_PER_COHORT) {
    const sorted = Object.entries(db[thirdPartyDomain].sites).sort((a, b) => b[1] - a[1]);
    db[thirdPartyDomain].sites = Object.fromEntries(sorted.slice(0, MAX_SITES_PER_COHORT));
  }

  const siteCount = Object.keys(db[thirdPartyDomain].sites).length;
  if (siteCount >= COHORT_THRESHOLD && !db[thirdPartyDomain].autoBlocked) {
    db[thirdPartyDomain].autoBlocked = true;
    await chrome.storage.local.set({ [KEY.COHORT]: db });
    await autoBlockCohort(thirdPartyDomain, tabId);
  } else {
    await chrome.storage.local.set({ [KEY.COHORT]: db });
  }
}

export async function autoBlockCohort(domain, tabId) {
  const id = cohortId(domain);
  const rule = { id, priority: 1, action: { type: "block" }, condition: { requestDomains: [domain], resourceTypes: ["script","image","xmlhttprequest","sub_frame"] } };
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [id], addRules: [rule] });
    if (tabId) inc(tabId, "cohortBlocked").catch(() => {});
  } catch (err) {
    console.warn("[openShield] autoBlockCohort failed:", err?.message || err);
  }
}

export async function getCohortStats() {
  const s = await chrome.storage.local.get(KEY.COHORT);
  const db = s[KEY.COHORT] || {};
  const entries = Object.entries(db).map(([domain, data]) => ({
    domain,
    siteCount: Object.keys(data.sites).length,
    autoBlocked: !!data.autoBlocked,
    firstSeen: data.firstSeen
  }));
  entries.sort((a, b) => b.siteCount - a.siteCount);
  return entries.slice(0, 100);
}

export async function cleanupCohortDB() {
  const s = await chrome.storage.local.get(KEY.COHORT);
  const db = s[KEY.COHORT] || {};
  const cutoff = Date.now() - COHORT_CLEANUP_DAYS * 24 * 60 * 60 * 1000;
  let cleaned = 0;
  for (const domain of Object.keys(db)) {
    if (db[domain].lastSeen < cutoff) { delete db[domain]; cleaned++; }
  }
  if (cleaned > 0) await chrome.storage.local.set({ [KEY.COHORT]: db });
}
