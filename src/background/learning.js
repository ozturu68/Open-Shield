/**
 * Learning Mode — heuristic tracker signal processing.
 * Receives signals from MAIN-world injected observer, scores them,
 * and triggers auto-blocking for persistent tracking domains.
 */
import { KEY, TRACKING_SCORES, LEARNING_THRESHOLD } from "../core/config.js";
import { hostname, normHost } from "../core/utils.js";
import { recordThirdParty, autoBlockCohort } from "./cohort.js";

export async function handleLearningSignals(tabId, signals, url) {
  if (!signals || !signals.length || !url) return;
  try {
    const thirdParty = hostname(url);
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab?.url) return;
    const firstParty = normHost(hostname(tab.url));
    if (!firstParty || firstParty === thirdParty) return;

    let score = 0;
    for (const sig of signals) score += TRACKING_SCORES[sig.type] || 0;

    if (score >= LEARNING_THRESHOLD) {
      const s = await chrome.storage.local.get(KEY.LEARNING);
      const learning = s[KEY.LEARNING] || {};
      if (!learning[thirdParty]) learning[thirdParty] = { scores: [], sites: new Set(), totalScore: 0 };
      learning[thirdParty].scores = [...(learning[thirdParty].scores || []).slice(-9), score];
      const sites = new Set(learning[thirdParty].sites || []);
      sites.add(firstParty);
      learning[thirdParty].sites = [...sites];
      learning[thirdParty].totalScore = learning[thirdParty].scores.reduce((a, b) => a + b, 0) / learning[thirdParty].scores.length;
      learning[thirdParty].sitesCount = sites.size;
      await chrome.storage.local.set({ [KEY.LEARNING]: learning });

      if (learning[thirdParty].totalScore >= 2 && sites.size >= 2) {
        await autoBlockCohort(thirdParty, tabId);
      }
    }

    await recordThirdParty(tabId, thirdParty);
  } catch (err) {
    console.warn("[openShield] handleLearningSignals failed:", err?.message || err);
  }
}
