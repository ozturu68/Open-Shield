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
  for (const rule of rules) {
    if (rule.action?.type === "redirect" && rule.condition?.regexFilter) {
      const re = new RegExp(rule.condition.regexFilter);
      const match = url.match(re);
      if (match) {
        const sub = rule.action.redirect.regexSubstitution;
        // Simple replacement of \1, \2, \3
        return sub
          .replace(/\\1/g, match[1] || "")
          .replace(/\\2/g, match[2] || "")
          .replace(/\\3/g, match[3] || "");
      }
    }
  }
  return url;
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

test("Regex rules strip known tracking parameters", () => {
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
