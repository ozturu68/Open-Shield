/**
 * Unit tests for ABP filter line conversion patterns
 * Tests the conversion logic that would run in convert-filters.js
 * Run with: node --test tests/unit/convert-rules.test.js
 */

const assert = require("node:assert");
const test = require("node:test");

function convertLine(line, nextId) {
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

  if (opts.csp || opts.redirect || opts.removeparam) return null;

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

  return { id: nextId, priority: isException ? 2 : 1, action: { type: isException ? "allow" : "block" }, condition };
}

test("convertLine handles domain-anchored URL filter", () => {
  const rule = convertLine("||example.com/ads.js", 1);
  assert.ok(rule);
  assert.strictEqual(rule.id, 1);
  assert.strictEqual(rule.priority, 1);
  assert.strictEqual(rule.action.type, "block");
  assert.strictEqual(rule.condition.urlFilter, "||example.com/ads.js");
});

test("convertLine handles regex filter", () => {
  const rule = convertLine("/ad[0-9]+\\.js/", 2);
  assert.ok(rule);
  assert.strictEqual(rule.condition.regexFilter, "ad[0-9]+\\.js");
});

test("convertLine skips cosmetic rules", () => {
  assert.strictEqual(convertLine("example.com##.ad-banner", 1), null);
  assert.strictEqual(convertLine("##.sidebar-ad", 2), null);
  assert.strictEqual(convertLine("example.com#?#.ad:has(a)", 3), null);
});

test("convertLine skips unsupported option types", () => {
  assert.strictEqual(convertLine("||example.com/path$csp=script-src 'none'", 1), null);
  assert.strictEqual(convertLine("||example.com/path$redirect=noopjs", 2), null);
  assert.strictEqual(convertLine("||example.com/path$removeparam=utm_source", 3), null);
});

test("convertLine handles resource type mapping", () => {
  const rule = convertLine("||tracker.com/analytics.js$script,third-party", 1);
  assert.ok(rule);
  assert.deepStrictEqual(rule.condition.resourceTypes, ["script"]);
  assert.strictEqual(rule.condition.domainType, "thirdParty");
});

test("convertLine handles exception rules", () => {
  const rule = convertLine("@@||trusted-site.com/ad$script", 1);
  assert.ok(rule);
  assert.strictEqual(rule.action.type, "allow");
  assert.strictEqual(rule.priority, 2);
});

test("convertLine handles domain option", () => {
  const rule = convertLine("||ad-server.com/banner$domain=example.com|test.org", 1);
  assert.ok(rule);
  assert.deepStrictEqual(rule.condition.initiatorDomains, ["example.com", "test.org"]);
});

test("convertLine skips comments and empty lines", () => {
  assert.strictEqual(convertLine("! This is a comment", 1), null);
  assert.strictEqual(convertLine("", 1), null);
  assert.strictEqual(convertLine("   ", 1), null);
  assert.strictEqual(convertLine("[Adblock Plus 2.0]", 1), null);
});
