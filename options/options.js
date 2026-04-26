/**
 * Options page logic — all four-phase features.
 */
(() => {
  "use strict";

  const KEY = { GLOBAL: "globalSettings", META: "filterMeta", ALLOW: "customAllowlist", BLOCK: "customBlocklist" };
  const MSG = { SET_GLOBAL: "SET_GLOBAL", GET_COHORT_STATS: "GET_COHORT_STATS" };

  const $ = id => document.getElementById(id);

  async function get(keys) { return chrome.storage.local.get(keys); }
  async function set(data) { return chrome.storage.local.set(data); }

  async function sendGlobal(k, v) {
    return new Promise((res, rej) => {
      chrome.runtime.sendMessage({ type: MSG.SET_GLOBAL, k, v }, r => {
        chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res(r);
      });
    });
  }

  async function loadGlobal() {
    const s = await get(KEY.GLOBAL);
    const g = s[KEY.GLOBAL] || {};
    $("g-ads").value = g.ads || "standard";
    $("g-cookies").value = g.cookies || "third-party";
    $("g-fp").checked = !!g.fp;
    $("g-fp-level").value = g.fpLevel || "medium";
    $("g-https").checked = !!g.https;
    $("g-shred").checked = !!g.shred;
    $("g-gpc").checked = g.gpc !== false;
    $("g-link-protection").checked = g.linkProtection !== false;
    $("g-click-to-load").checked = g.clickToLoad !== false;
    $("g-amp-protection").checked = g.ampProtection !== false;
    $("g-xss-protection").checked = g.xssProtection !== false;
    $("g-dynamic-3p").checked = !!g.dynamic3p;
    $("g-procedural").checked = g.proceduralCosmetic !== false;
    $("g-learning").checked = g.learningMode !== false;
    $("g-secure-js").checked = !!g.secureJS;
  }

  $("save-global").addEventListener("click", async () => {
    const settings = {
      ads: $("g-ads").value,
      cookies: $("g-cookies").value,
      fp: $("g-fp").checked,
      fpLevel: $("g-fp-level").value,
      https: $("g-https").checked,
      shred: $("g-shred").checked,
      gpc: $("g-gpc").checked,
      linkProtection: $("g-link-protection").checked,
      clickToLoad: $("g-click-to-load").checked,
      ampProtection: $("g-amp-protection").checked,
      xssProtection: $("g-xss-protection").checked,
      dynamic3p: $("g-dynamic-3p").checked,
      proceduralCosmetic: $("g-procedural").checked,
      learningMode: $("g-learning").checked,
      secureJS: $("g-secure-js").checked
    };
    for (const [k, v] of Object.entries(settings)) await sendGlobal(k, v);
    $("saved-global").classList.remove("hidden");
    setTimeout(() => $("saved-global").classList.add("hidden"), 1500);
  });

  async function loadFilters() {
    const s = await get(KEY.META);
    const m = s[KEY.META] || {};
    const lists = [
      { id: "easylist", name: "EasyList (Ads)" },
      { id: "easyprivacy", name: "EasyPrivacy (Trackers)" },
      { id: "params", name: "URL Parameter Stripping" },
      { id: "https_upgrade", name: "HTTPS Upgrade" },
      { id: "headers", name: "Header Modifications" },
      { id: "3p-block", name: "3rd-Party Script/Frame Block" }
    ];
    const tbody = $("filter-body");
    tbody.innerHTML = "";
    for (const l of lists) {
      const meta = m[l.id] || {};
      const tr = document.createElement("tr");
      const td1 = document.createElement("td"); td1.textContent = l.name;
      const td2 = document.createElement("td");
      const cb = document.createElement("input");
      cb.type = "checkbox"; cb.checked = meta.enabled !== false;
      cb.addEventListener("change", async () => {
        try {
          await chrome.declarativeNetRequest.updateEnabledRulesets({
            [cb.checked ? "enableRulesetIds" : "disableRulesetIds"]: [l.id]
          });
          const s2 = await get(KEY.META); const m2 = s2[KEY.META] || {};
          m2[l.id] = { ...m2[l.id], enabled: cb.checked };
          await set({ [KEY.META]: m2 });
        } catch (e) { console.error(e); cb.checked = !cb.checked; }
      });
      td2.appendChild(cb);
      tr.appendChild(td1); tr.appendChild(td2);
      tbody.appendChild(tr);
    }
  }

  async function loadLists() {
    const s = await get([KEY.ALLOW, KEY.BLOCK]);
    $("allow").value = (s[KEY.ALLOW] || []).join("\n");
    $("block").value = (s[KEY.BLOCK] || []).join("\n");
  }

  $("save-lists").addEventListener("click", async () => {
    const domainRe = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;
    const allow = $("allow").value.split("\n").map(s => s.trim().toLowerCase()).filter(s => s && domainRe.test(s));
    const block = $("block").value.split("\n").map(s => s.trim().toLowerCase()).filter(s => s && domainRe.test(s));
    await set({ [KEY.ALLOW]: allow, [KEY.BLOCK]: block });
    try {
      const existing = await chrome.declarativeNetRequest.getDynamicRules();
      const remove = existing.filter(r => r.id >= 150_000 && r.id < 200_000).map(r => r.id);
      const add = allow.map((domain, i) => ({
        id: 150_000 + i, priority: 2000, action: { type: "allow" },
        condition: { initiatorDomains: [domain], resourceTypes: ["main_frame","sub_frame","script","image","stylesheet","xmlhttprequest","media","font","other"] }
      }));
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: remove, addRules: add });
    } catch (e) { console.error(e); }
    $("saved-lists").classList.remove("hidden");
    setTimeout(() => $("saved-lists").classList.add("hidden"), 1500);
  });

  async function loadCohortStats() {
    try {
      const resp = await new Promise((res) => chrome.runtime.sendMessage({ type: MSG.GET_COHORT_STATS }, r => res(r)));
      const el = $("cohort-stats");
      el.innerHTML = "";
      if (resp?.stats?.length) {
        for (const s of resp.stats.slice(0, 10)) {
          const row = document.createElement("div");
          row.style.cssText = "display:flex;justify-content:space-between;margin-bottom:4px";
          const domainSpan = document.createElement("span");
          domainSpan.textContent = s.domain;
          const infoSpan = document.createElement("span");
          infoSpan.style.color = "var(--muted)";
          infoSpan.textContent = s.siteCount + " sites" + (s.autoBlocked ? " (auto-blocked)" : "");
          row.appendChild(domainSpan);
          row.appendChild(infoSpan);
          el.appendChild(row);
        }
      } else {
        el.textContent = "No cross-site trackers detected yet. Browse more sites to build the database.";
      }
    } catch { $("cohort-stats").textContent = "Stats unavailable."; }
  }

  loadGlobal().catch(() => {});
  loadFilters().catch(() => {});
  loadLists().catch(() => {});
  loadCohortStats().catch(() => {});
})();
