/**
 * Unit tests for src/config.js
 */
const assert = require("node:assert");
const test = require("node:test");

async function load() { return import("../../src/config.js"); }

test("DEFAULT_SETTINGS has expected keys", async () => {
  const { DEFAULT_SETTINGS } = await load();
  assert.ok("ads" in DEFAULT_SETTINGS);
  assert.ok("fp" in DEFAULT_SETTINGS);
  assert.ok("https" in DEFAULT_SETTINGS);
  assert.ok("cookies" in DEFAULT_SETTINGS);
  assert.ok("bounce" in DEFAULT_SETTINGS);
  assert.ok("params" in DEFAULT_SETTINGS);
  assert.ok("cosmetic" in DEFAULT_SETTINGS);
  assert.ok("shred" in DEFAULT_SETTINGS);
});

test("KEY and SESSION constants are strings", async () => {
  const { KEY, SESSION } = await load();
  assert.strictEqual(typeof KEY.GLOBAL, "string");
  assert.strictEqual(typeof SESSION.COUNTERS, "string");
  assert.strictEqual(typeof KEY.COHORT, "string");
  assert.strictEqual(typeof KEY.LEARNING, "string");
  assert.strictEqual(typeof KEY.JS_BLOCKED, "string");
  assert.strictEqual(typeof SESSION.LEARNING_SESSION, "string");
});

test("BOUNCE_DOMAINS is non-empty array", async () => {
  const { BOUNCE_DOMAINS } = await load();
  assert.ok(Array.isArray(BOUNCE_DOMAINS));
  assert.ok(BOUNCE_DOMAINS.length > 0);
});

test("TRACKING_PARAMS contains known params", async () => {
  const { TRACKING_PARAMS } = await load();
  assert.ok(TRACKING_PARAMS.includes("utm_source"));
  assert.ok(TRACKING_PARAMS.includes("fbclid"));
  assert.ok(TRACKING_PARAMS.includes("ttclid"));
  assert.ok(TRACKING_PARAMS.includes("mtm_campaign"));
  assert.ok(TRACKING_PARAMS.includes("pk_campaign"));
});

test("DEFAULT_SETTINGS includes Phase 1 privacy features", async () => {
  const { DEFAULT_SETTINGS } = await load();
  assert.ok("gpc" in DEFAULT_SETTINGS);
  assert.ok("linkProtection" in DEFAULT_SETTINGS);
  assert.ok("clickToLoad" in DEFAULT_SETTINGS);
});

test("DEFAULT_SETTINGS includes Phase 2-4 features", async () => {
  const { DEFAULT_SETTINGS } = await load();
  assert.ok("dynamic3p" in DEFAULT_SETTINGS);
  assert.ok("proceduralCosmetic" in DEFAULT_SETTINGS);
  assert.ok("learningMode" in DEFAULT_SETTINGS);
  assert.ok("secureJS" in DEFAULT_SETTINGS);
  assert.ok("xssProtection" in DEFAULT_SETTINGS);
  assert.ok("ampProtection" in DEFAULT_SETTINGS);
});

test("EMBED_DOMAINS exists and includes known platforms", async () => {
  const { EMBED_DOMAINS } = await load();
  assert.ok(Array.isArray(EMBED_DOMAINS));
  assert.ok(EMBED_DOMAINS.length > 0);
  assert.ok(EMBED_DOMAINS.some(d => d.includes("facebook.com")));
  assert.ok(EMBED_DOMAINS.some(d => d.includes("youtube.com")));
  assert.ok(EMBED_DOMAINS.some(d => d.includes("twitter.com")));
});

test("CLICK_TO_LOAD_TEXTS has entries for major platforms", async () => {
  const { CLICK_TO_LOAD_TEXTS } = await load();
  assert.ok("facebook" in CLICK_TO_LOAD_TEXTS);
  assert.ok("youtube" in CLICK_TO_LOAD_TEXTS);
  assert.ok("twitter" in CLICK_TO_LOAD_TEXTS);
  assert.ok("default" in CLICK_TO_LOAD_TEXTS);
});

test("FP_NOISE_FACTORS includes strict level", async () => {
  const { FP_NOISE_FACTORS } = await load();
  assert.ok("strict" in FP_NOISE_FACTORS);
});

test("MSG constants include new message types", async () => {
  const { MSG } = await load();
  assert.strictEqual(MSG.SET_DYNAMIC_3P, "SET_DYNAMIC_3P");
  assert.strictEqual(MSG.GET_COHORT_STATS, "GET_COHORT_STATS");
  assert.strictEqual(typeof MSG.SECURITY_ALERT, "string");
});

test("COHORT_THRESHOLD is positive number", async () => {
  const { COHORT_THRESHOLD } = await load();
  assert.strictEqual(typeof COHORT_THRESHOLD, "number");
  assert.ok(COHORT_THRESHOLD > 0);
});

test("TRACKING_SCORES has valid weights", async () => {
  const { TRACKING_SCORES } = await load();
  for (const key of ["thirdPartyCookie", "canvasFingerprint", "localStorage", "beacon", "navigatorProbe"]) {
    assert.ok(typeof TRACKING_SCORES[key] === "number" && TRACKING_SCORES[key] > 0);
  }
});

test("AMP_CACHE_DOMAINS is non-empty array", async () => {
  const { AMP_CACHE_DOMAINS } = await load();
  assert.ok(Array.isArray(AMP_CACHE_DOMAINS));
  assert.ok(AMP_CACHE_DOMAINS.length > 0);
});

test("PROCEDURAL_OPERATORS includes all expected operators", async () => {
  const { PROCEDURAL_OPERATORS } = await load();
  assert.ok(PROCEDURAL_OPERATORS.includes("has-text"));
  assert.ok(PROCEDURAL_OPERATORS.includes("matches-css"));
  assert.ok(PROCEDURAL_OPERATORS.includes("xpath"));
  assert.ok(PROCEDURAL_OPERATORS.includes("upward"));
});
