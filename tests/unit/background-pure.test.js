/**
 * Unit tests for background.js pure functions
 * Tests abpLineToDNR conversion, hostname validators, and ruleKey extraction.
 * Imports from actual modules (no duplication).
 * Run with: node --test tests/unit/background-pure.test.js
 */
const assert = require("node:assert");
const test = require("node:test");

let abpLineToDNR, ruleKey, isValidHostname, isValidDestination;

async function loadModules() {
  const filters = await import("../../src/background/filters.js");
  abpLineToDNR = filters.abpLineToDNR;
  ruleKey = filters.ruleKey;
  const utils = await import("../../src/core/utils.js");
  isValidHostname = utils.isValidHostname;
  isValidDestination = utils.isValidDestination;
}

// ---- abpLineToDNR tests ----

test("abpLineToDNR converts simple domain-anchor", { concurrency: true }, async () => {
  await loadModules();
  const r = abpLineToDNR("||doubleclick.net^", 1);
  assert.ok(r);
  assert.strictEqual(r.id, 1);
  assert.strictEqual(r.action.type, "block");
  assert.strictEqual(r.condition.urlFilter, "||doubleclick.net^");
});

test("abpLineToDNR converts with resource type", { concurrency: true }, async () => {
  await loadModules();
  const r = abpLineToDNR("||tracker.com/analytics.js$script,third-party", 2);
  assert.ok(r);
  assert.deepStrictEqual(r.condition.resourceTypes, ["script"]);
  assert.strictEqual(r.condition.domainType, "thirdParty");
});

test("abpLineToDNR converts multi-type filter", { concurrency: true }, async () => {
  await loadModules();
  const r = abpLineToDNR("||cdn.com/ad.js$script,image,stylesheet", 3);
  assert.ok(r);
  assert.deepStrictEqual(r.condition.resourceTypes, ["script", "image", "stylesheet"]);
});

test("abpLineToDNR handles exceptions", { concurrency: true }, async () => {
  await loadModules();
  const r = abpLineToDNR("@@||trusted.com^$document", 4);
  assert.ok(r);
  assert.strictEqual(r.action.type, "allow");
  assert.strictEqual(r.priority, 2);
});

test("abpLineToDNR handles domain restrictions", { concurrency: true }, async () => {
  await loadModules();
  const r = abpLineToDNR("||ad-server.com/banner$domain=example.com|test.org", 5);
  assert.ok(r);
  assert.deepStrictEqual(r.condition.initiatorDomains, ["example.com", "test.org"]);
});

test("abpLineToDNR handles excluded domains", { concurrency: true }, async () => {
  await loadModules();
  const r = abpLineToDNR("||tracker.com/$domain=example.com|~trusted.com", 6);
  assert.ok(r);
  assert.deepStrictEqual(r.condition.initiatorDomains, ["example.com"]);
  assert.deepStrictEqual(r.condition.excludedInitiatorDomains, ["trusted.com"]);
});

test("abpLineToDNR handles regex filter", { concurrency: true }, async () => {
  await loadModules();
  const r = abpLineToDNR("/ad[0-9]+\\.js/", 7);
  assert.ok(r);
  assert.strictEqual(r.condition.regexFilter, "ad[0-9]+\\.js");
});

test("abpLineToDNR skips cosmetic rules", { concurrency: true }, async () => {
  await loadModules();
  assert.strictEqual(abpLineToDNR("##.ad-banner", 1), null);
  assert.strictEqual(abpLineToDNR("example.com##.sponsored", 2), null);
  assert.strictEqual(abpLineToDNR("example.com#@#.ad", 3), null);
  assert.strictEqual(abpLineToDNR("example.com#?#.ad:has(a)", 4), null);
});

test("abpLineToDNR skips unsupported options", { concurrency: true }, async () => {
  await loadModules();
  assert.strictEqual(abpLineToDNR("||example.com/path$csp=script-src 'none'", 1), null);
  assert.strictEqual(abpLineToDNR("||example.com/path$redirect=noopjs", 2), null);
  assert.strictEqual(abpLineToDNR("||example.com/path$removeparam=utm_source", 3), null);
  assert.strictEqual(abpLineToDNR("||example.com/path$redirectrule=noopjs", 4), null);
});

test("abpLineToDNR skips comments and empty lines", { concurrency: true }, async () => {
  await loadModules();
  assert.strictEqual(abpLineToDNR("", 1), null);
  assert.strictEqual(abpLineToDNR("   ", 2), null);
  assert.strictEqual(abpLineToDNR("! Easylist comment", 3), null);
  assert.strictEqual(abpLineToDNR("[Adblock Plus 2.0]", 4), null);
});

test("abpLineToDNR handles popup/document type mapping", { concurrency: true }, async () => {
  await loadModules();
  const r = abpLineToDNR("||popup-ads.com/$popup", 8);
  assert.ok(r);
  assert.deepStrictEqual(r.condition.resourceTypes, ["main_frame"]);
});

test("abpLineToDNR handles subdocument type", { concurrency: true }, async () => {
  await loadModules();
  const r = abpLineToDNR("||frame-ads.com/$subdocument", 9);
  assert.ok(r);
  assert.deepStrictEqual(r.condition.resourceTypes, ["sub_frame"]);
});

test("abpLineToDNR handles first-party filter", { concurrency: true }, async () => {
  await loadModules();
  const r = abpLineToDNR("||self-ad.com/ad$first-party", 10);
  assert.ok(r);
  assert.strictEqual(r.condition.domainType, "firstParty");
});

// ---- ruleKey tests ----

test("ruleKey extracts urlFilter", { concurrency: true }, async () => {
  await loadModules();
  const rule = { id: 1, action: { type: "block" }, condition: { urlFilter: "||ad.com" } };
  assert.strictEqual(ruleKey(rule), "||ad.com");
});

test("ruleKey extracts regexFilter when no urlFilter", { concurrency: true }, async () => {
  await loadModules();
  const rule = { id: 1, action: { type: "block" }, condition: { regexFilter: "ad[0-9]+" } };
  assert.strictEqual(ruleKey(rule), "ad[0-9]+");
});

test("ruleKey returns empty string for rule with neither filter", { concurrency: true }, async () => {
  await loadModules();
  const rule = { id: 1, action: { type: "block" }, condition: {} };
  assert.strictEqual(ruleKey(rule), "");
});

// ---- isValidHostname tests ----

test("isValidHostname accepts valid hostnames", { concurrency: true }, async () => {
  await loadModules();
  assert.strictEqual(isValidHostname("example.com"), true);
  assert.strictEqual(isValidHostname("sub.example.co.uk"), true);
  assert.strictEqual(isValidHostname("a.co"), true);
});

test("isValidHostname rejects invalid inputs", { concurrency: true }, async () => {
  await loadModules();
  assert.strictEqual(isValidHostname(""), false);
  assert.strictEqual(isValidHostname(null), false);
  assert.strictEqual(isValidHostname(123), false);
  assert.strictEqual(isValidHostname("-start.com"), false);
  assert.strictEqual(isValidHostname("end-.com"), false);
  assert.strictEqual(isValidHostname("double..dot.com"), false);
  assert.strictEqual(isValidHostname("a".repeat(256)), false);
  assert.strictEqual(isValidHostname("https://example.com"), false);
});

test("isValidHostname rejects hostnames with invalid characters", { concurrency: true }, async () => {
  await loadModules();
  assert.strictEqual(isValidHostname("example.com/path"), false);
  assert.strictEqual(isValidHostname("exam ple.com"), false);
  assert.strictEqual(isValidHostname("exam\tple.com"), false);
});

// ---- isValidDestination tests ----

test("isValidDestination accepts valid HTTP(S) URLs", { concurrency: true }, async () => {
  await loadModules();
  assert.strictEqual(isValidDestination("https://example.com"), true);
  assert.strictEqual(isValidDestination("http://example.com/path"), true);
  assert.strictEqual(isValidDestination("https://sub.example.com?q=1"), true);
});

test("isValidDestination rejects non-http protocols", { concurrency: true }, async () => {
  await loadModules();
  assert.strictEqual(isValidDestination("ftp://example.com"), false);
  assert.strictEqual(isValidDestination("javascript:alert(1)"), false);
  assert.strictEqual(isValidDestination("chrome://extensions"), false);
});

test("isValidDestination rejects invalid strings", { concurrency: true }, async () => {
  await loadModules();
  assert.strictEqual(isValidDestination(""), false);
  assert.strictEqual(isValidDestination("not-a-url"), false);
  assert.strictEqual(isValidDestination(null), false);
  assert.strictEqual(isValidDestination(undefined), false);
  assert.strictEqual(isValidDestination(42), false);
});

test("isValidDestination rejects excessively long strings", { concurrency: true }, async () => {
  await loadModules();
  const long = "https://example.com/" + "x".repeat(4097);
  assert.strictEqual(isValidDestination(long), false);
});

test("isValidDestination requires a hostname", { concurrency: true }, async () => {
  await loadModules();
  assert.strictEqual(isValidDestination("https://"), false);
});
