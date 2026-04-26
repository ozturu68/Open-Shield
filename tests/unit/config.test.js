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

test("DEFAULT_SETTINGS includes new privacy features", async () => {
  const { DEFAULT_SETTINGS } = await load();
  assert.ok("gpc" in DEFAULT_SETTINGS);
  assert.ok("linkProtection" in DEFAULT_SETTINGS);
  assert.ok("clickToLoad" in DEFAULT_SETTINGS);
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
