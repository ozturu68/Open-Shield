/**
 * Unit tests for URL parameter stripping rules
 * Run with: node --test tests/unit/params.test.js
 */

const assert = require("node:assert");
const test = require("node:test");
const fs = require("fs");
const path = require("path");

const RULES_PATH = path.join(__dirname, "../../rules/params.json");

function loadRules() {
  return JSON.parse(fs.readFileSync(RULES_PATH, "utf-8"));
}

function simulateDNRRedirect(url, rules) {
  try {
    const u = new URL(url);
    for (const rule of rules) {
      if (rule.action?.type === "redirect" && rule.action.redirect?.transform?.queryTransform?.removeParams) {
        for (const param of rule.action.redirect.transform.queryTransform.removeParams) {
          u.searchParams.delete(param);
        }
      }
      // Legacy regexFilter support (for backward compat)
      if (rule.action?.type === "redirect" && rule.condition?.regexFilter) {
        const re = new RegExp(rule.condition.regexFilter);
        const match = url.match(re);
        if (match) {
          const sub = rule.action.redirect.regexSubstitution;
          url = sub
            .replace(/\\1/g, match[1] || "")
            .replace(/\\2/g, match[2] || "")
            .replace(/\\3/g, match[3] || "");
          return url;
        }
      }
    }
    return u.toString();
  } catch { return url; }
}

test("params.json is valid JSON array", () => {
  const rules = loadRules();
  assert.ok(Array.isArray(rules));
  assert.ok(rules.length > 0);
});

test("All rules have required DNR fields", () => {
  const rules = loadRules();
  for (const rule of rules) {
    assert.ok(typeof rule.id === "number", "Rule must have numeric id");
    assert.ok(rule.action, "Rule must have action");
    assert.ok(rule.condition, "Rule must have condition");
  }
});

test("Rules use queryTransform.removeParams format", () => {
  const rules = loadRules();
  for (const rule of rules) {
    assert.ok(
      rule.action?.redirect?.transform?.queryTransform?.removeParams,
      "Rule should use queryTransform.removeParams"
    );
  }
});

test("RemoveParams rules strip known tracking parameters", () => {
  const rules = loadRules();
  const cases = [
    {
      input: "https://example.com/?utm_source=google&id=123",
      expectNo: ["utm_source="],
      expectYes: ["id=123"]
    },
    {
      input: "https://example.com/?id=123&utm_medium=email",
      expectNo: ["utm_medium="],
      expectYes: ["id=123"]
    },
    {
      input: "https://example.com/?fbclid=abc&foo=bar",
      expectNo: ["fbclid="],
      expectYes: ["foo=bar"]
    },
    {
      input: "https://example.com/?gclid=xyz",
      expectNo: ["gclid="]
    },
    {
      input: "https://example.com/?gclid=abc&gclsrc=def&keep=yes",
      expectNo: ["gclid=", "gclsrc="],
      expectYes: ["keep=yes"]
    },
    {
      input: "https://example.com/?ttclid=test&msclkid=test2&real=param",
      expectNo: ["ttclid=", "msclkid="],
      expectYes: ["real=param"]
    }
  ];

  for (const c of cases) {
    const result = simulateDNRRedirect(c.input, rules);
    for (const bad of c.expectNo) {
      assert.ok(!result.includes(bad), `${bad} should be stripped from ${c.input} (got ${result})`);
    }
    for (const good of c.expectYes || []) {
      assert.ok(result.includes(good), `${good} should be preserved in ${c.input} (got ${result})`);
    }
  }
});

test("Non-tracking params are preserved", () => {
  const rules = loadRules();
  const url = "https://example.com/page?q=search&page=2&sort=desc";
  const result = simulateDNRRedirect(url, rules);
  assert.ok(result.includes("q=search"));
  assert.ok(result.includes("sort=desc"));
});

test("URL without params is unchanged", () => {
  const rules = loadRules();
  const url = "https://example.com/clean/path";
  const result = simulateDNRRedirect(url, rules);
  assert.strictEqual(result, url);
});
