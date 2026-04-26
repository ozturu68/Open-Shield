/**
 * Advanced Filter List Fetcher
 * Downloads filter lists from configured sources in data/sources.json
 * Usage: node tools/fetch-lists.js
 */

const fs = require("fs");
const https = require("https");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CACHE = path.join(ROOT, "data", ".cache");
const SOURCES = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "sources.json"), "utf-8"));

function fetch(url, retries = 2) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetch(res.headers.location, retries).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    });
    req.on("error", (e) => {
      if (retries > 0) fetch(url, retries - 1).then(resolve).catch(reject);
      else reject(e);
    });
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

async function main() {
  if (!fs.existsSync(CACHE)) fs.mkdirSync(CACHE, { recursive: true });

  const lists = [...SOURCES.filterLists, ...SOURCES.regionalLists].filter(l => l.enabled !== false);

  for (const list of lists) {
    const out = path.join(CACHE, `${list.id}.txt`);
    console.log(`[fetch] ${list.name} ...`);
    try {
      const data = await fetch(list.url);
      fs.writeFileSync(out, data, "utf-8");
      const lines = data.split(/\r?\n/).length;
      const rules = data.split(/\r?\n/).filter(l => l.trim() && !l.startsWith("!")).length;
      console.log(`  Saved ${lines} lines (${rules} rules) -> ${path.relative(ROOT, out)}`);
    } catch (e) {
      console.error(`  Failed: ${e.message}`);
      if (fs.existsSync(out)) {
        console.log(`  Using cached version.`);
      }
    }
  }

  // Fetch HSTS preload list
  if (SOURCES.hstsPreload?.enabled) {
    console.log(`[fetch] HSTS Preload List ...`);
    try {
      const data = await fetch(SOURCES.hstsPreload.url);
      const decoded = Buffer.from(data, "base64").toString("utf-8");
      fs.writeFileSync(path.join(CACHE, "hsts-preload.json"), decoded, "utf-8");
      console.log(`  Saved HSTS preload data`);
    } catch (e) {
      console.error(`  Failed: ${e.message}`);
    }
  }
}

main().catch(console.error);
