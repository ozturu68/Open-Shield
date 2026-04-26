/**
 * openShield Master Build Orchestrator
 * Usage: node tools/build.js
 *
 * Pipeline:
 * 1. Fetch filter lists (if not cached)
 * 2. Convert network filters -> DNR JSON
 * 3. Extract cosmetic filters -> src/cosmetic.js
 * 4. Build HSTS HTTPS upgrade rules
 * 5. Validate manifest & DNR rules
 * 6. Package extension zip
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const CACHE = path.join(ROOT, "data", ".cache");
const RULES = path.join(ROOT, "rules");
const OUT = path.join(ROOT, "openShield-v1.0.0.zip");

function log(msg) { console.log(`[build] ${msg}`); }
function die(msg) { console.error(`[build] ERROR: ${msg}`); process.exit(1); }
function readJSON(p) { return JSON.parse(fs.readFileSync(p, "utf-8")); }

function validateManifest() {
  log("Validating manifest.json...");
  const m = readJSON(path.join(ROOT, "manifest.json"));
  if (m.manifest_version !== 3) die("manifest_version must be 3");
  if (!m.name || !m.version) die("name and version required");
  if (!m.background?.service_worker) die("service_worker required");
  if (!m.declarative_net_request?.rule_resources) die("rule_resources required");
  log("manifest.json valid");
}

function validateRules() {
  log("Validating DNR rule files...");
  let total = 0;
  const files = fs.readdirSync(RULES).filter(f => f.endsWith(".json"));
  for (const file of files) {
    const p = path.join(RULES, file);
    let rules;
    try { rules = readJSON(p); } catch (e) { die(`Invalid JSON in ${file}: ${e.message}`); }
    if (!Array.isArray(rules)) {
      if (file === "bounce_domains.json") { log(`  ${file}: data file`); continue; }
      die(`${file} must be array`);
    }
    if (file === "bounce_domains.json") { log(`  ${file}: data file`); continue; }
    const ids = new Set();
    for (const r of rules) {
      if (typeof r.id !== "number") die(`Missing id in ${file}`);
      if (ids.has(r.id)) die(`Duplicate id ${r.id} in ${file}`);
      ids.add(r.id);
      if (!r.action?.type) die(`Missing action.type for id ${r.id} in ${file}`);
      if (!r.condition) die(`Missing condition for id ${r.id} in ${file}`);
    }
    total += rules.length;
    log(`  ${file}: ${rules.length} rules`);
  }
  if (total > 30000) die(`Total ${total} exceeds 30,000 limit`);
  log(`Total rules: ${total} — within limit`);
}

function runTests() {
  log("Running unit tests...");
  try {
    execSync("node --test tests/unit/**/*.test.js", { cwd: ROOT, stdio: "inherit" });
    log("All tests passed");
  } catch {
    die("Unit tests failed");
  }
}

async function createZip() {
  log("Creating distribution zip...");
  const archiver = require("archiver");
  const output = fs.createWriteStream(OUT);
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(output);

  const exclude = new Set(["tools", "tests", "data", "node_modules", ".git", "openShield-v1.0.0.zip"]);
  function addDir(dir, base) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = path.join(base, entry.name);
      if (exclude.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) addDir(full, rel);
      else archive.file(full, { name: rel });
    }
  }
  addDir(ROOT, ".");
  archive.finalize();

  return new Promise((res, rej) => {
    output.on("close", () => { log(`Created ${OUT} (${archive.pointer()} bytes)`); res(); });
    archive.on("error", rej);
  });
}

async function main() {
  validateManifest();
  validateRules();
  runTests();

  try { await createZip(); }
  catch (e) {
    if (e.code === "MODULE_NOT_FOUND") log("archiver not installed; skipping zip");
    else throw e;
  }

  log("Build complete.");
}

main().catch(die);
