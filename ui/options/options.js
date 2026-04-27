/**
 * openShield Options Page — Simplified, Modern UI
 */
(() => {
  "use strict";

  const MSG = { GET_COHORT_STATS: "GET_COHORT_STATS" };
  const SESSION = { COUNTERS: "tabCounters" };

  const $ = id => document.getElementById(id);

  async function get(keys) {
    return chrome.storage.local.get(keys);
  }

  async function getSession(keys) {
    return chrome.storage.session.get(keys);
  }

  async function loadStats() {
    try {
      const [localData, sessionData] = await Promise.all([
        get("globalSettings"),
        getSession(SESSION.COUNTERS)
      ]);

      const counters = sessionData[SESSION.COUNTERS] || {};
      let totalBlocked = 0;
      let totalUpgraded = 0;

      for (const tabId in counters) {
        const c = counters[tabId];
        totalBlocked += (c.blocked || 0) + (c.cohortBlocked || 0) + (c.jsBlocked || 0);
        totalUpgraded += (c.upgraded || 0);
      }

      animateNumber("stat-blocked", totalBlocked);
      animateNumber("stat-upgraded", totalUpgraded);

    } catch (e) {
      console.warn("[openShield] Stats unavailable:", e);
    }
  }

  function animateNumber(id, target) {
    const el = $(id);
    if (!el) return;

    const duration = 1000;
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * eased);

      el.textContent = formatNumber(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toLocaleString();
  }

  async function loadCohortStats() {
    const el = $("cohort-stats");
    if (!el) return;

    try {
      const resp = await new Promise(resolve => {
        chrome.runtime.sendMessage({ type: MSG.GET_COHORT_STATS }, r => resolve(r));
      });

      el.innerHTML = "";

      if (!resp?.stats?.length) {
        el.innerHTML = '<div class="cohort-empty">No trackers detected yet.<br>Keep browsing!</div>';
        animateNumber("stat-trackers", 0);
        return;
      }

      let totalTrackers = resp.stats.length;
      animateNumber("stat-trackers", totalTrackers);

      const topTrackers = resp.stats.slice(0, 8);
      topTrackers.forEach((s, i) => {
        const item = document.createElement("div");
        item.className = "cohort-item";
        item.style.animationDelay = `${i * 50}ms`;

        item.innerHTML = `
          <span class="cohort-domain" title="${escapeHtml(s.domain)}">${escapeHtml(s.domain)}</span>
          <span class="cohort-info">
            <span class="cohort-sites">${s.siteCount} sites</span>
            ${s.autoBlocked ? '<span class="cohort-blocked">Blocked</span>' : ""}
          </span>
        `;

        el.appendChild(item);
      });

      if (resp.stats.length > 8) {
        const more = document.createElement("div");
        more.className = "cohort-empty";
        more.style.padding = "10px";
        more.textContent = `+${resp.stats.length - 8} more trackers detected`;
        el.appendChild(more);
      }

    } catch (e) {
      el.innerHTML = '<div class="cohort-empty">Unable to load tracker data</div>';
    }
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function init() {
    loadStats();
    loadCohortStats();

    let statsInterval = setInterval(loadStats, 5000);

    function handleVisibility() {
      if (document.hidden) {
        clearInterval(statsInterval);
        statsInterval = null;
      } else if (!statsInterval) {
        statsInterval = setInterval(loadStats, 5000);
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("unload", () => {
      clearInterval(statsInterval);
      document.removeEventListener("visibilitychange", handleVisibility);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();