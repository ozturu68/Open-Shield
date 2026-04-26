/**
 * Comprehensive ABP -> DNR Converter
 * Handles: domain anchors, options ($third-party, $script, $image, etc.),
 * exceptions (@@), regex filters, and resource type mapping.
 * Usage: node tools/convert-filters.js <input.txt> <output.json> [--max=N]
 */

const fs = require("fs");

const RESOURCE_MAP = {
  script: "script",
  image: "image",
  stylesheet: "stylesheet",
  xmlhttprequest: "xmlhttprequest",
  font: "font",
  media: "media",
  popup: "main_frame",
  document: "main_frame",
  subdocument: "sub_frame",
  websocket: "websocket",
  ping: "ping",
  other: "other"
};

function parseOptions(str) {
  const opts = {};
  if (!str) return opts;
  str.split(",").forEach(p => {
    const [k, v] = p.split("=");
    opts[k.trim()] = v ? v.trim() : true;
  });
  return opts;
}

function mapResourceTypes(opts) {
  const types = [];
  for (const [key, val] of Object.entries(RESOURCE_MAP)) {
    if (opts[key]) types.push(val);
  }
  return types.length ? types : undefined;
}

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

  const opts = parseOptions(optStr);

  // Skip unsupported options
  if (opts.csp || opts.redirect || opts.removeparam || opts.redirectrule || opts.jsonprune) return null;

  const condition = {};

  // Parse rule pattern
  if (rulePart.startsWith("||")) {
    condition.urlFilter = rulePart;
  } else if (rulePart.startsWith("|") && rulePart.endsWith("|")) {
    condition.urlFilter = rulePart;
  } else if (rulePart.startsWith("/") && rulePart.endsWith("/")) {
    condition.regexFilter = rulePart.slice(1, -1);
  } else if (rulePart.includes("*") || rulePart.includes("^")) {
    condition.urlFilter = rulePart;
  } else {
    condition.urlFilter = rulePart;
  }

  const resourceTypes = mapResourceTypes(opts);
  if (resourceTypes) condition.resourceTypes = resourceTypes;

  if (opts["third-party"]) condition.domainType = "thirdParty";
  if (opts["first-party"]) condition.domainType = "firstParty";

  if (opts.domain) {
    const domains = opts.domain.split("|").map(d => d.trim()).filter(d => d && !d.startsWith("~"));
    const excludedDomains = opts.domain.split("|").map(d => d.trim()).filter(d => d.startsWith("~")).map(d => d.slice(1));
    if (domains.length) condition.initiatorDomains = domains;
    if (excludedDomains.length) condition.excludedInitiatorDomains = excludedDomains;
  }

  if (opts["~third-party"]) {
    delete condition.domainType;
  }

  return {
    id: nextId,
    priority: isException ? 2 : 1,
    action: { type: isException ? "allow" : "block" },
    condition
  };
}

function main() {
  const [input, output] = process.argv.slice(2);
  const maxArg = process.argv.find(a => a.startsWith("--max="));
  const MAX_RULES = maxArg ? parseInt(maxArg.slice(6)) : 29000;

  if (!input || !output) {
    console.error("Usage: node convert-filters.js <input.txt> <output.json> [--max=N]");
    process.exit(1);
  }

  const lines = fs.readFileSync(input, "utf-8").split(/\r?\n/);
  const rules = [];
  const seen = new Set();
  let nextId = 1;
  let skippedComments = 0;
  let skippedUnsupported = 0;
  let skippedMalformed = 0;
  let skippedDuplicates = 0;

  for (const line of lines) {
    if (rules.length >= MAX_RULES) break;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("!") || trimmed.startsWith("[")) { skippedComments++; continue; }
    if (trimmed.includes("##") || trimmed.includes("#@#") || trimmed.includes("#?#")) { skippedUnsupported++; continue; }
    if (trimmed.includes("$csp") || trimmed.includes("$redirect") || trimmed.includes("$removeparam")) { skippedUnsupported++; continue; }
    if (trimmed.length > 4096) { skippedMalformed++; continue; }

    let rule;
    try {
      rule = convertLine(line, nextId);
    } catch { skippedMalformed++; continue; }
    if (!rule) { skippedUnsupported++; continue; }

    const key = rule.condition.urlFilter || rule.condition.regexFilter || "";
    if (seen.has(key)) { skippedDuplicates++; continue; }
    seen.add(key);

    rules.push(rule);
    nextId++;
  }

  fs.writeFileSync(output, JSON.stringify(rules, null, 2), "utf-8");
  console.log(`Converted ${lines.length} lines -> ${rules.length} DNR rules -> ${output}`);
  if (skippedComments || skippedUnsupported || skippedMalformed || skippedDuplicates) {
    console.log(`  Skipped: ${skippedComments} comments, ${skippedUnsupported} unsupported, ${skippedMalformed} malformed, ${skippedDuplicates} duplicates`);
  }
}

main();
