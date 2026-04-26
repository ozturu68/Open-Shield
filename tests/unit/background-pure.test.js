/**
 * Unit tests for background.js pure functions
 * Tests abpLineToDNR conversion, hostname validators, and ruleKey extraction
 * Run with: node --test tests/unit/background-pure.test.js
 */

const assert = require("node:assert");
const test = require("node:test");

// ---- Replicated pure functions from background.js ----

function abpLineToDNR(line, id) {
  line = line.trim();
  if (!line || line.startsWith("!") || line.startsWith("[")) return null;
  if (line.includes("##") || line.includes("#@#") || line.includes("#?#")) return null;

  const isException = line.startsWith("@@");
  if (isException) line = line.slice(2);

  const optIdx = line.lastIndexOf("$");
  let rulePart = line;
  let optStr = "";
  if (optIdx > 0) {
    rulePart = line.slice(0, optIdx);
    optStr = line.slice(optIdx + 1);
  }

  const opts = {};
  if (optStr) {
    optStr.split(",").forEach(p => {
      const eq = p.indexOf("=");
      opts[p.slice(0, eq === -1 ? p.length : eq).trim()] = eq === -1 ? true : p.slice(eq + 1).trim();
    });
  }

  if (opts.csp || opts.redirect || opts.removeparam || opts.redirectrule) return null;

  const condition = {};

  if (rulePart.startsWith("||")) {
    condition.urlFilter = rulePart;
  } else if (rulePart.startsWith("/") && rulePart.endsWith("/")) {
    condition.regexFilter = rulePart.slice(1, -1);
  } else if (rulePart.includes("*") || rulePart.includes("^")) {
    condition.urlFilter = rulePart;
  } else {
    condition.urlFilter = rulePart;
  }

  const typeMap = { script: "script", image: "image", stylesheet: "stylesheet", xmlhttprequest: "xmlhttprequest", font: "font", media: "media", subdocument: "sub_frame", websocket: "websocket", ping: "ping", other: "other", popup: "main_frame", document: "main_frame" };
  const types = [];
  for (const [k, v] of Object.entries(typeMap)) {
    if (opts[k]) types.push(v);
  }
  if (types.length) condition.resourceTypes = types;

  if (opts["third-party"]) condition.domainType = "thirdParty";
  if (opts["first-party"]) condition.domainType = "firstParty";

  if (opts.domain) {
    const ds = opts.domain.split("|").map(d => d.trim());
    const incl = ds.filter(d => d && !d.startsWith("~"));
    const excl = ds.filter(d => d.startsWith("~")).map(d => d.slice(1));
    if (incl.length) condition.initiatorDomains = incl;
    if (excl.length) condition.excludedInitiatorDomains = excl;
  }

  return { id, priority: isException ? 2 : 1, action: { type: isException ? "allow" : "block" }, condition };
}

function ruleKey(rule) {
  return rule.condition.urlFilter || rule.condition.regexFilter || "";
}

function isValidHostname(h) {
  return typeof h === "string" && h.length > 0 && h.length < 256 && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(h);
}

function isValidDestination(dest) {
  if (typeof dest !== "string" || dest.length > 4096) return false;
  try {
    const u = new URL(dest);
    return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.length > 0;
  } catch { return false; }
}

// ---- abpLineToDNR tests ----

test("abpLineToDNR converts simple domain-anchor", () => {
  const r = abpLineToDNR("||doubleclick.net^", 1);
  assert.ok(r);
  assert.strictEqual(r.id, 1);
  assert.strictEqual(r.action.type, "block");
  assert.strictEqual(r.condition.urlFilter, "||doubleclick.net^");
});

test("abpLineToDNR converts with resource type", () => {
  const r = abpLineToDNR("||tracker.com/analytics.js$script,third-party", 2);
  assert.ok(r);
  assert.deepStrictEqual(r.condition.resourceTypes, ["script"]);
  assert.strictEqual(r.condition.domainType, "thirdParty");
});

test("abpLineToDNR converts multi-type filter", () => {
  const r = abpLineToDNR("||cdn.com/ad.js$script,image,stylesheet", 3);
  assert.ok(r);
  assert.deepStrictEqual(r.condition.resourceTypes, ["script", "image", "stylesheet"]);
});

test("abpLineToDNR handles exceptions", () => {
  const r = abpLineToDNR("@@||trusted.com^$document", 4);
  assert.ok(r);
  assert.strictEqual(r.action.type, "allow");
  assert.strictEqual(r.priority, 2);
});

test("abpLineToDNR handles domain restrictions", () => {
  const r = abpLineToDNR("||ad-server.com/banner$domain=example.com|test.org", 5);
  assert.ok(r);
  assert.deepStrictEqual(r.condition.initiatorDomains, ["example.com", "test.org"]);
});

test("abpLineToDNR handles excluded domains", () => {
  const r = abpLineToDNR("||tracker.com/$domain=example.com|~trusted.com", 6);
  assert.ok(r);
  assert.deepStrictEqual(r.condition.initiatorDomains, ["example.com"]);
  assert.deepStrictEqual(r.condition.excludedInitiatorDomains, ["trusted.com"]);
});

test("abpLineToDNR handles regex filter", () => {
  const r = abpLineToDNR("/ad[0-9]+\\.js/", 7);
  assert.ok(r);
  assert.strictEqual(r.condition.regexFilter, "ad[0-9]+\\.js");
});

test("abpLineToDNR skips cosmetic rules", () => {
  assert.strictEqual(abpLineToDNR("##.ad-banner", 1), null);
  assert.strictEqual(abpLineToDNR("example.com##.sponsored", 2), null);
  assert.strictEqual(abpLineToDNR("example.com#@#.ad", 3), null);
  assert.strictEqual(abpLineToDNR("example.com#?#.ad:has(a)", 4), null);
});

test("abpLineToDNR skips unsupported options", () => {
  assert.strictEqual(abpLineToDNR("||example.com/path$csp=script-src 'none'", 1), null);
  assert.strictEqual(abpLineToDNR("||example.com/path$redirect=noopjs", 2), null);
  assert.strictEqual(abpLineToDNR("||example.com/path$removeparam=utm_source", 3), null);
  assert.strictEqual(abpLineToDNR("||example.com/path$redirectrule=noopjs", 4), null);
});

test("abpLineToDNR skips comments and empty lines", () => {
  assert.strictEqual(abpLineToDNR("", 1), null);
  assert.strictEqual(abpLineToDNR("   ", 2), null);
  assert.strictEqual(abpLineToDNR("! Easylist comment", 3), null);
  assert.strictEqual(abpLineToDNR("[Adblock Plus 2.0]", 4), null);
});

test("abpLineToDNR handles popup/document type mapping", () => {
  const r = abpLineToDNR("||popup-ads.com/$popup", 8);
  assert.ok(r);
  assert.deepStrictEqual(r.condition.resourceTypes, ["main_frame"]);
});

test("abpLineToDNR handles subdocument type", () => {
  const r = abpLineToDNR("||frame-ads.com/$subdocument", 9);
  assert.ok(r);
  assert.deepStrictEqual(r.condition.resourceTypes, ["sub_frame"]);
});

test("abpLineToDNR handles first-party filter", () => {
  const r = abpLineToDNR("||self-ad.com/ad$first-party", 10);
  assert.ok(r);
  assert.strictEqual(r.condition.domainType, "firstParty");
});

// ---- ruleKey tests ----

test("ruleKey extracts urlFilter", () => {
  const rule = { id: 1, action: { type: "block" }, condition: { urlFilter: "||ad.com" } };
  assert.strictEqual(ruleKey(rule), "||ad.com");
});

test("ruleKey extracts regexFilter when no urlFilter", () => {
  const rule = { id: 1, action: { type: "block" }, condition: { regexFilter: "ad[0-9]+" } };
  assert.strictEqual(ruleKey(rule), "ad[0-9]+");
});

test("ruleKey returns empty string for rule with neither filter", () => {
  const rule = { id: 1, action: { type: "block" }, condition: {} };
  assert.strictEqual(ruleKey(rule), "");
});

// ---- isValidHostname tests ----

test("isValidHostname accepts valid hostnames", () => {
  assert.strictEqual(isValidHostname("example.com"), true);
  assert.strictEqual(isValidHostname("sub.example.co.uk"), true);
  assert.strictEqual(isValidHostname("a.co"), true);
});

test("isValidHostname rejects invalid inputs", () => {
  assert.strictEqual(isValidHostname(""), false);
  assert.strictEqual(isValidHostname(null), false);
  assert.strictEqual(isValidHostname(123), false);
  assert.strictEqual(isValidHostname("-start.com"), false);
  assert.strictEqual(isValidHostname("end-.com"), false);
  assert.strictEqual(isValidHostname("double..dot.com"), false);
  assert.strictEqual(isValidHostname("a".repeat(256)), false);
  assert.strictEqual(isValidHostname("https://example.com"), false);
});

test("isValidHostname rejects hostnames with invalid characters", () => {
  assert.strictEqual(isValidHostname("example.com/path"), false);
  assert.strictEqual(isValidHostname("exam ple.com"), false);
  assert.strictEqual(isValidHostname("exam\tple.com"), false);
});

// ---- isValidDestination tests ----

test("isValidDestination accepts valid HTTP(S) URLs", () => {
  assert.strictEqual(isValidDestination("https://example.com"), true);
  assert.strictEqual(isValidDestination("http://example.com/path"), true);
  assert.strictEqual(isValidDestination("https://sub.example.com?q=1"), true);
});

test("isValidDestination rejects non-http protocols", () => {
  assert.strictEqual(isValidDestination("ftp://example.com"), false);
  assert.strictEqual(isValidDestination("javascript:alert(1)"), false);
  assert.strictEqual(isValidDestination("chrome://extensions"), false);
});

test("isValidDestination rejects invalid strings", () => {
  assert.strictEqual(isValidDestination(""), false);
  assert.strictEqual(isValidDestination("not-a-url"), false);
  assert.strictEqual(isValidDestination(null), false);
  assert.strictEqual(isValidDestination(undefined), false);
  assert.strictEqual(isValidDestination(42), false);
});

test("isValidDestination rejects excessively long strings", () => {
  const long = "https://example.com/" + "x".repeat(4097);
  assert.strictEqual(isValidDestination(long), false);
});

test("isValidDestination requires a hostname", () => {
  assert.strictEqual(isValidDestination("https://"), false);
});
