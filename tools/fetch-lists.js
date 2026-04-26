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

const MAX_REDIRECTS = 5;
const MAX_SIZE = 50 * 1024 * 1024;
const ALLOWED_HOSTS = new Set([
  "easylist.to", "easylist-downloads.adblockplus.org",
  "raw.githubusercontent.com", "filters.adtidy.org",
  "chromium.googlesource.com"
]);

function isValidSourceURL(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return ALLOWED_HOSTS.has(u.hostname);
  } catch { return false; }
}

function fetch(url, retries = 2, depth = 0) {
  if (depth > MAX_REDIRECTS) return Promise.reject(new Error("Too many redirects for " + url));
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).href;
        if (!isValidSourceURL(redirectUrl)) {
          reject(new Error(`Redirect to untrusted host: ${redirectUrl}`));
          return;
        }
        fetch(redirectUrl, retries, depth + 1).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      let data = "";
      let size = 0;
      res.on("data", chunk => {
        size += chunk.length;
        if (size > MAX_SIZE) { req.destroy(); reject(new Error("Response too large")); return; }
        data += chunk;
      });
      res.on("end", () => resolve(data));
    });
    req.on("error", (e) => {
      if (retries > 0) fetch(url, retries - 1, depth).then(resolve).catch(reject);
      else reject(e);
    });
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

async function main() {
  if (!fs.existsSync(CACHE)) fs.mkdirSync(CACHE, { recursive: true });

  const lists = [...SOURCES.filterLists, ...SOURCES.regionalLists].filter(l => l.enabled !== false);

  for (const list of lists) {
    if (!isValidSourceURL(list.url)) {
      console.error(`[fetch] Skipping ${list.name}: untrusted URL ${list.url}`);
      continue;
    }
    const safeId = String(list.id).replace(/[^a-z0-9_-]/gi, "");
    if (safeId !== list.id) {
      console.error(`[fetch] Skipping ${list.name}: unsafe id`);
      continue;
    }
    const out = path.join(CACHE, `${safeId}.txt`);
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
    if (!isValidSourceURL(SOURCES.hstsPreload.url)) {
      console.error(`[fetch] Skipping HSTS preload: untrusted URL`);
    } else {
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
}

main().catch(console.error);
