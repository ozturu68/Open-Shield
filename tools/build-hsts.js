/**
 * Build HTTPS upgrade rules from HSTS preload list
 * Usage: node tools/build-hsts.js <hsts-preload.json> <output.json> [--max=N]
 */

const fs = require("fs");

const [input, output] = process.argv.slice(2);
const maxArg = process.argv.find(a => a.startsWith("--max="));
const MAX_RULES = maxArg ? parseInt(maxArg.slice(6)) : 1000;

if (!input || !output) {
  console.error("Usage: node build-hsts.js <hsts-preload.json> <output.json> [--max=N]");
  process.exit(1);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(input, "utf-8"));
} catch {
  console.error("Invalid HSTS preload JSON");
  process.exit(1);
}

const entries = data.entries || [];
const rules = [];
let id = 1;

for (const entry of entries) {
  if (rules.length >= MAX_RULES) break;
  if (!entry.name || !entry.mode || entry.mode !== "force-https") continue;

  const domain = entry.name;

  rules.push({
    id: id++,
    priority: 1,
    action: { type: "upgradeScheme" },
    condition: {
      urlFilter: `http://${domain}`,
      resourceTypes: ["main_frame"]
    }
  });

  // Also match www variant if not already included
  if (!domain.startsWith("www.")) {
    rules.push({
      id: id++,
      priority: 1,
      action: { type: "upgradeScheme" },
      condition: {
        urlFilter: `http://www.${domain}`,
        resourceTypes: ["main_frame"]
      }
    });
  }
}

fs.writeFileSync(output, JSON.stringify(rules, null, 2), "utf-8");
console.log(`Built ${rules.length} HTTPS upgrade rules -> ${output}`);
