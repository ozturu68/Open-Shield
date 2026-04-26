/**
 * Popup logic — with dynamic 3P control and JS blocking toggles.
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

    // Dynamic 3P control toggle
    $("toggle-3p").checked = cfg.dynamic3p === true;
    // JS blocking toggle
    $("toggle-js").checked = state.jsBlocked === true;
  }

  $("master").addEventListener("change", async () => {
    const on = $("master").checked;
    $("status-text").textContent = on ? "Shields are up" : "Shields are down";
    $("status-text").classList.toggle("off", !on);
    await send(MSG.SET_SITE, { h: hostname, k: "shields", v: on });
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
