# openShield Build Guide

## Prerequisites

- **Node.js** v18 or later
- **Git** (optional, for contributing)

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/openShield/openShield.git
cd openShield

# 2. Fetch filter lists (optional - pre-built rules are included)
node tools/fetch-lists.js

# 3. Convert filter lists to DNR rules (only needed after fetch-lists)
node tools/convert-filters.js data/.cache/easylist.txt rules/easylist.json
node tools/convert-filters.js data/.cache/easyprivacy.txt rules/easyprivacy.json
node tools/convert-filters.js data/.cache/ublock-filters.txt rules/ublock-filters.json
node tools/convert-filters.js data/.cache/ublock-privacy.txt rules/ublock-privacy.json
node tools/convert-filters.js data/.cache/adguard-base.txt rules/adguard-base.json
node tools/convert-filters.js data/.cache/adguard-tracking.txt rules/adguard-tracking.json

# 4. Extract cosmetic CSS selectors (optional)
node tools/extract-cosmetic.js data/.cache/easylist.txt

# 5. Run tests
node --test tests/unit/**/*.test.js

# 6. Build the extension
node tools/build.js
```

## Development Workflow

### Load Unpacked Extension

1. Open `chrome://extensions` in Chromium
2. Enable "Developer mode" (toggle top-right)
3. Click "Load unpacked" and select the project root directory
4. The extension icon appears in the toolbar

### Testing Changes

- **Service worker**: Changes take effect on extension reload (chrome://extensions → refresh icon)
- **Content scripts**: Changes require page refresh on all tabs
- **Popup/Options**: Open new popup/options tab for changes

### Filter List Management

Filter lists are managed in `data/sources.json`. There are two update mechanisms:

1. **Static rules** (`rules/*.json`): Included with the extension. Updated only when a new version is released.
2. **Dynamic rules** (auto-updated): uBlock Origin and AdGuard lists are refreshed every 4 days via `chrome.alarms`. These rules use the dynamic DNR quota (max 5,000).

#### Adding a New Filter List

1. Add an entry to `data/sources.json`
2. Run `node tools/fetch-lists.js` to download the list
3. Run `node tools/convert-filters.js data/.cache/<id>.txt rules/<id>.json` to generate DNR rules
4. Add the ruleset to `manifest.json` under `declarative_net_request.rule_resources`
5. Rebuild and reload the extension

## Build Output

Running `node tools/build.js` performs:
1. Manifest validation (MV3, required fields)
2. Rules validation (valid JSON, unique IDs, 30,000 rule limit)
3. Unit test execution
4. ZIP archive creation (`openShield-v{VERSION}.zip`)

## Directory Reference

| Directory | Purpose |
|-----------|---------|
| `src/` | Extension source (service worker, content scripts, modules) |
| `rules/` | Static DNR rules (JSON format) |
| `popup/` | Toolbar popup UI |
| `options/` | Settings page UI |
| `tools/` | Build and conversion scripts |
| `data/` | Configuration and filter list cache |
| `tests/` | Unit tests (Node.js built-in test runner) |
| `icons/` | PNG icons (16/32/48/128) |

## Troubleshooting

- **"Failed to load extension"**: Check `manifest.json` syntax and file paths. All referenced files must exist.
- **"DNR ruleset not found"**: Ensure all `rule_resources` entries in `manifest.json` point to existing `rules/*.json` files.
- **Service worker not loading**: Check browser console at `chrome://extensions` → "Inspect views: service worker".
- **Content scripts not running**: Verify `matches` patterns in `manifest.json`. Use `chrome://extensions` → "Inspect views" to debug.
