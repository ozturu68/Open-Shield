/**
 * openShield Popup — Modern, Animated UI
 */
(async () => {
  "use strict";

  const MSG = { GET_STATE: "GET_STATE", SET_SITE: "SET_SITE" };
  const $ = id => document.getElementById(id);

  const send = (type, payload) => new Promise((res) => {
    chrome.runtime.sendMessage({ type, ...payload }, r => {
      if (chrome.runtime.lastError) res(null);
      else res(r);
    });
  });

  function isBrowserPage(u) {
    return !u || /^((chrome|edge|brave|about|chrome-extension|moz-extension):\/\/)/.test(u);
  }

  function norm(h) {
    return (h || "").replace(/^www\./, "").toLowerCase();
  }

  function animateValue(el, target) {
    if (!el) return;
    const duration = 600;
    const start = performance.now();
    const startVal = parseInt(el.textContent) || 0;

    function update(currentTime) {
      const elapsed = currentTime - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (target - startVal) * eased);
      el.textContent = current.toLocaleString();
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }

  let tabId, hostname = "";

  function updateShieldUI(on) {
    const shieldIcon = $("shield-icon");
    const statusText = $("status-text");
    shieldIcon.classList.toggle("protected", on);
    shieldIcon.classList.toggle("unprotected", !on);
    statusText.classList.toggle("protected", on);
    statusText.classList.toggle("unprotected", !on);
    statusText.textContent = on ? "Protected" : "Unprotected";
  }

  async function init() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabId = tab.id;
    const url = tab.url || "";

    if (isBrowserPage(url)) {
      $("restricted").classList.remove("hidden");
      $("main").classList.add("hidden");
      return;
    }

    hostname = norm(new URL(url).hostname);
    $("hostname").textContent = hostname || "this site";

    const state = await send(MSG.GET_STATE, { tabId });
    if (!state) return;

    const cfg = state.cfg || {};
    const counts = state.counts || {};

    const blocked = (counts.blocked || 0) + (counts.cohortBlocked || 0) + (counts.jsBlocked || 0);
    const upgraded = counts.upgraded || 0;
    const bounces = counts.bounces || 0;

    animateValue($("c-blocked"), blocked);
    animateValue($("c-upgraded"), upgraded);
    animateValue($("c-bounces"), bounces);

    const total = blocked;
    $("status-count").textContent = total > 0
      ? `${total.toLocaleString()} blocked`
      : "No threats";

    const on = cfg.shields !== false;
    $("master").checked = on;
    updateShieldUI(on);
  }

  $("master").addEventListener("change", async () => {
    const on = $("master").checked;
    updateShieldUI(on);
    await send(MSG.SET_SITE, { h: hostname, k: "shields", v: on });
  });

  $("btn-reload").addEventListener("click", () => {
    chrome.tabs.reload(tabId);
    window.close();
  });

  $("btn-opt").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  init().catch(() => {});
})();