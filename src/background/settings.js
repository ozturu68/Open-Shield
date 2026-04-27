/**
 * Settings engine, counters, and block log with write-through caching.
 * Includes batched storage writes for performance.
 */
import { DEFAULT_SETTINGS, KEY, SESSION, LOG_MAX, COUNTERS_BATCH_MS, LOG_BATCH_MS } from "../core/config.js";
import { merge, normHost, hostname } from "../core/utils.js";

const logCache = new Map();
const tabCountersCache = new Map();

// ── Counter Batching ──
let countersPending = false;
let countersTimer = null;

async function flushCounters() {
  countersPending = false;
  countersTimer = null;
  try {
    const s = await chrome.storage.session.get(SESSION.COUNTERS);
    const all = s[SESSION.COUNTERS] || {};
    for (const [tid, cnt] of tabCountersCache) all[tid] = cnt;
    await chrome.storage.session.set({ [SESSION.COUNTERS]: all });
  } catch {}
}

// ── Log Batching ──
const logBatch = new Map();
let logFlushTimer = null;

async function flushLogs() {
  logFlushTimer = null;
  try {
    const s = await chrome.storage.session.get(SESSION.LOG);
    const all = s[SESSION.LOG] || {};
    for (const [tid, entries] of logBatch) all[tid] = logCache.get(tid) || [];
    await chrome.storage.session.set({ [SESSION.LOG]: all });
    logBatch.clear();
  } catch {}
}

// ── Settings ──

export async function initDefaults() {
  const s = await chrome.storage.local.get([KEY.GLOBAL, KEY.SITES, KEY.COHORT, KEY.LEARNING, KEY.JS_BLOCKED]);
  const g = merge(DEFAULT_SETTINGS, s[KEY.GLOBAL] || {});
  await chrome.storage.local.set({
    [KEY.GLOBAL]: g,
    [KEY.SITES]: s[KEY.SITES] || {},
    [KEY.COHORT]: s[KEY.COHORT] || {},
    [KEY.LEARNING]: s[KEY.LEARNING] || {},
    [KEY.JS_BLOCKED]: s[KEY.JS_BLOCKED] || {}
  });
}

export async function effective(h) {
  const s = await chrome.storage.local.get([KEY.GLOBAL, KEY.SITES]);
  const g = merge(DEFAULT_SETTINGS, s[KEY.GLOBAL] || {});
  const site = (s[KEY.SITES] || {})[h] || {};
  if (site.shields === false) {
    return { ...g, shields: false, ads: "off", fp: false, https: false, cookies: "off", bounce: false, params: false, cosmetic: false, gpc: false, linkProtection: false, clickToLoad: false, dynamic3p: false, proceduralCosmetic: false, learningMode: false, secureJS: false, xssProtection: false, ampProtection: false };
  }
  return merge(g, site);
}

// ── Counters ──

export async function counters(tabId) {
  const cached = tabCountersCache.get(tabId);
  if (cached) return cached;
  const s = await chrome.storage.session.get(SESSION.COUNTERS);
  const c = (s[SESSION.COUNTERS] || {})[tabId] || { blocked: 0, upgraded: 0, bounces: 0, jsBlocked: 0, cohortBlocked: 0 };
  tabCountersCache.set(tabId, c);
  return c;
}

export async function inc(tabId, field) {
  if (!field) return;
  let c = tabCountersCache.get(tabId);
  if (!c) {
    const s = await chrome.storage.session.get(SESSION.COUNTERS);
    c = (s[SESSION.COUNTERS] || {})[tabId] || { blocked: 0, upgraded: 0, bounces: 0, jsBlocked: 0, cohortBlocked: 0 };
    tabCountersCache.set(tabId, c);
  }
  c[field] = (c[field] || 0) + 1;

  if (!countersPending) {
    countersPending = true;
    countersTimer = setTimeout(flushCounters, COUNTERS_BATCH_MS);
  }

  const t = c.blocked + c.upgraded + (c.jsBlocked || 0) + (c.cohortBlocked || 0);
  if (t > 0) {
    chrome.action.setBadgeText({ tabId, text: t > 99 ? "99+" : String(t) }).catch(() => {});
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#E07B00" }).catch(() => {});
  } else {
    chrome.action.setBadgeText({ tabId, text: "" }).catch(() => {});
  }
}

// ── Block Log ──

export async function pushLog(tabId, entry) {
  let l = logCache.get(tabId);
  if (!l) { const s = await chrome.storage.session.get(SESSION.LOG); l = (s[SESSION.LOG] || {})[tabId] || []; }
  l.push(entry);
  if (l.length > LOG_MAX) l = l.slice(-LOG_MAX);
  logCache.set(tabId, l);

  const batch = logBatch.get(tabId) || [];
  batch.push(entry);
  logBatch.set(tabId, batch);

  if (!logFlushTimer) logFlushTimer = setTimeout(flushLogs, LOG_BATCH_MS);
}

export async function getLog(tabId) {
  let l = logCache.get(tabId);
  if (!l) { const s = await chrome.storage.session.get(SESSION.LOG); l = (s[SESSION.LOG] || {})[tabId] || []; logCache.set(tabId, l); }
  return l;
}

export function clearTabCaches(tabId) {
  logCache.delete(tabId);
  tabCountersCache.delete(tabId);
  logBatch.delete(tabId);
}
