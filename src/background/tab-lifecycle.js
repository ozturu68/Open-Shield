/**
 * Tab lifecycle management: auto-shred, icon state, and origin tracking.
 */
import { KEY, SESSION } from "../core/config.js";
import { normHost, hostname, isBrowser } from "../core/utils.js";
import { effective, clearTabCaches } from "./settings.js";

export async function autoShred(tabId) {
  const s = await chrome.storage.local.get(KEY.GLOBAL);
  if (!s[KEY.GLOBAL]?.shred) return;
  const r = await chrome.storage.session.get(SESSION.ORIGINS);
  const o = (r[SESSION.ORIGINS] || {})[tabId];
  if (!o) return;
  await chrome.browsingData.remove({ origins: [o] }, {
    cookies: true, localStorage: true, cacheStorage: true, indexedDB: true, serviceWorkers: true
  });
  const a = r[SESSION.ORIGINS] || {}; delete a[tabId];
  await chrome.storage.session.set({ [SESSION.ORIGINS]: a });
}

export async function setIcon(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    const h = normHost(hostname(tab.url || ""));
    const browser = isBrowser(tab.url);
    let prefix = browser || !h ? "shield-partial" : (await effective(h)).shields !== false ? "shield-on" : "shield-off";
    await chrome.action.setIcon({
      tabId,
      path: {
        16: `icons/${prefix}-16.png`,
        32: `icons/${prefix}-32.png`,
        48: `icons/${prefix}-48.png`,
        128: `icons/${prefix}-128.png`
      }
    });
  } catch (err) {
    console.warn("[openShield] setIcon failed:", err?.message || err);
  }
}

export function setupTabListeners() {
  chrome.tabs.onRemoved.addListener(tabId => {
    autoShred(tabId).catch(() => {});
    clearTabCaches(tabId);
  });

  chrome.tabs.onUpdated.addListener((tabId, ch, tab) => {
    if (ch.url && tab.url) {
      try {
        const o = new URL(tab.url).origin;
        chrome.storage.session.get(SESSION.ORIGINS).then(r => {
          const a = r[SESSION.ORIGINS] || {};
          a[tabId] = o;
          return chrome.storage.session.set({ [SESSION.ORIGINS]: a });
        }).catch(() => {});
      } catch {}
    }
  });

  chrome.tabs.onActivated.addListener(({ tabId }) => setIcon(tabId).catch(() => {}));
  chrome.tabs.onUpdated.addListener((tabId, ch) => {
    if (ch.url || ch.status === "complete") setIcon(tabId).catch(() => {});
  });
}
