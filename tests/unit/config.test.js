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
});
