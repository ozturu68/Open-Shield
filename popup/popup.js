/**
 * Popup logic — enhanced with protection badges and detailed status.
 */
(async () => {
  "use strict";

  const MSG = { GET_STATE: "GET_STATE", SET_SITE: "SET_SITE" };
  const $ = id => document.getElementById(id);

  const send = (type, payload) => new Promise((res, rej) => {
    chrome.runtime.sendMessage({ type, ...payload }, r => {
      chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res(r);
    });
  });

  function browser(u) { return !u || /^((chrome|edge|brave|about|chrome-extension|moz-extension):\/\/)/.test(u); }
  function norm(h) { return (h || "").replace(/^www\./, "").toLowerCase(); }

  let tabId, hostname = "";

  function updateBadges(cfg) {
    const adsOn = cfg.ads !== "off";
    const fpOn = cfg.fp !== false;
    const paramsOn = cfg.params !== false;
    const cookiesOn = cfg.cookies !== "off";

    $("badge-ads").className = "badge " + (adsOn ? "badge-on" : "badge-off");
    $("badge-ads").textContent = "Ads";
    $("badge-fp").className = "badge " + (fpOn ? "badge-on" : "badge-off");
    $("badge-fp").textContent = "FP";
    $("badge-params").className = "badge " + (paramsOn ? "badge-on" : "badge-off");
    $("badge-params").textContent = "Params";
    $("badge-cookies").className = "badge " + (cookiesOn ? "badge-on" : "badge-off");
    $("badge-cookies").textContent = "Cookies";
  }

  function getStatusDescription(cfg, counts) {
    const total = (counts?.blocked || 0) + (counts?.cohortBlocked || 0);
    if (cfg.shields === false) return "All protections disabled for this site";
    if (total === 0) return "No threats detected";
    if (total < 10) return `${total} threats blocked`;
    return `${total}+ threats blocked`;
  }

  async function init() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabId = tab.id;
    const url = tab.url || "";

    if (browser(url)) {
      $("restricted").classList.remove("hidden");
      $("main").classList.add("hidden");
      return;
    }

    hostname = norm(new URL(url).hostname);
    $("hostname").textContent = hostname || "this site";

    const state = await send(MSG.GET_STATE, { tabId });
    const cfg = state.cfg || {};

    $("c-blocked").textContent = (state.counts?.blocked || 0) + (state.counts?.cohortBlocked || 0);
    $("c-upgraded").textContent = state.counts?.upgraded || 0;
    $("c-bounces").textContent = state.counts?.bounces || 0;

    const on = cfg.shields !== false;
    $("master").checked = on;
    $("status-text").textContent = on ? "Shields are up" : "Shields are down";
    $("status-text").classList.toggle("off", !on);
    $("status-desc").textContent = getStatusDescription(cfg, state.counts);

    updateBadges(cfg);

    $("toggle-3p").checked = cfg.dynamic3p === true;
    $("toggle-js").checked = state.jsBlocked === true;
  }

  $("master").addEventListener("change", async () => {
    const on = $("master").checked;
    $("status-text").textContent = on ? "Shields are up" : "Shields are down";
    $("status-text").classList.toggle("off", !on);
    await send(MSG.SET_SITE, { h: hostname, k: "shields", v: on });

    const state = await send(MSG.GET_STATE, { tabId });
    const cfg = state.cfg || {};
    $("status-desc").textContent = getStatusDescription(cfg, state.counts);
    updateBadges(cfg);

    $("reload").classList.remove("hidden");
  });

  $("toggle-3p").addEventListener("change", async () => {
    const on = $("toggle-3p").checked;
    await send(MSG.SET_SITE, { h: hostname, k: "dynamic3p", v: on });
    $("reload").classList.remove("hidden");
  });

  $("toggle-js").addEventListener("change", async () => {
    const on = $("toggle-js").checked;
    await send(MSG.SET_SITE, { h: hostname, k: "secureJS", v: on });
    $("reload").classList.remove("hidden");
  });

  $("btn-reload").addEventListener("click", () => { chrome.tabs.reload(tabId); window.close(); });
  $("btn-opt").addEventListener("click", () => { chrome.runtime.openOptionsPage(); window.close(); });

  init().catch(() => {});
})();