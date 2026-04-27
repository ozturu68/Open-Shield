/**
 * openShield Options Page — Settings + Stats + Cohort Insights
 */
(() => {
  "use strict";

  const MSG = { GET_COHORT_STATS: "GET_COHORT_STATS", SET_GLOBAL: "SET_GLOBAL" };
  const SESSION = { COUNTERS: "tabCounters" };

  const $ = id => document.getElementById(id);

  // Boolean setting keys
  const boolKeys = ["fp","https","bounce","params","cosmetic","shred","gpc","linkProtection","clickToLoad","proceduralCosmetic","learningMode","xssProtection","ampProtection"];
  // Select setting keys
  const selectKeys = ["ads","fpLevel","cookies"];

  function send(type, payload) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ type, ...payload }, r => {
        if (chrome.runtime.lastError) resolve(null);
        else resolve(r);
      });
    });
  }

  async function loadSettings() {
    const s = await chrome.storage.local.get("globalSettings");
    return s.globalSettings || {};
  }

  function applySettings(cfg) {
    if ($("setting-ads")) $("setting-ads").value = cfg.ads || "standard";
    if ($("setting-fpLevel")) $("setting-fpLevel").value = cfg.fpLevel || "medium";
    if ($("setting-cookies")) $("setting-cookies").value = cfg.cookies || "third-party";

    boolKeys.forEach(k => {
      const el = $(`setting-${k}`);
      if (el) el.checked = cfg[k] !== false;
    });
  }

  function bindChange(id, key, type) {
    const el = $(id);
    if (!el) return;
    el.addEventListener("change", async () => {
      const value = type === "checkbox" ? el.checked : el.value;
      await send(MSG.SET_GLOBAL, { k: key, v: value });
      if (key === "fp") {
        const levelEl = $("setting-fpLevel");
        if (levelEl) levelEl.disabled = !value;
      }
    });
  }

  function bindSettings() {
    bindChange("setting-ads", "ads", "select");
    bindChange("setting-fp", "fp", "checkbox");
    bindChange("setting-fpLevel", "fpLevel", "select");
    bindChange("setting-https", "https", "checkbox");
    bindChange("setting-cookies", "cookies", "select");
    boolKeys.forEach(k => bindChange(`setting-${k}`, k, "checkbox"));
  }

  // ── Stats ──

  async function loadStats() {
    try {
      const sessionData = await chrome.storage.session.get(SESSION.COUNTERS);
      const counters = sessionData[SESSION.COUNTERS] || {};
      let totalBlocked = 0, totalUpgraded = 0;
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
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toLocaleString();
  }

  // ── Cohort ──

  async function loadCohortStats() {
    const el = $("cohort-stats");
    if (!el) return;
    try {
      const resp = await send(MSG.GET_COHORT_STATS, {});
      el.innerHTML = "";
      if (!resp?.stats?.length) {
        el.innerHTML = '<div class="cohort-empty">No trackers detected yet.<br>Keep browsing!</div>';
        animateNumber("stat-trackers", 0);
        return;
      }
      animateNumber("stat-trackers", resp.stats.length);
      const topTrackers = resp.stats.slice(0, 8);
      topTrackers.forEach((s, i) => {
        const item = document.createElement("div");
        item.className = "cohort-item";
        item.style.animationDelay = `${i * 50}ms`;
        item.innerHTML = `<span class="cohort-domain" title="${escapeHtml(s.domain)}">${escapeHtml(s.domain)}</span><span class="cohort-info"><span class="cohort-sites">${s.siteCount} sites</span>${s.autoBlocked ? '<span class="cohort-blocked">Blocked</span>' : ""}</span>`;
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

  // ── Init ──

  let statsInterval = null;

  async function init() {
    const cfg = await loadSettings();
    applySettings(cfg);
    bindSettings();

    const fpEl = $("setting-fpLevel");
    if (fpEl && $("setting-fp")) {
      fpEl.disabled = !$("setting-fp").checked;
    }

    loadStats();
    loadCohortStats();

    statsInterval = setInterval(loadStats, 5000);

    function handleVisibility() {
      if (document.hidden) {
        if (statsInterval) { clearInterval(statsInterval); statsInterval = null; }
      } else if (!statsInterval) {
        statsInterval = setInterval(loadStats, 5000);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("unload", () => {
      if (statsInterval) clearInterval(statsInterval);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
