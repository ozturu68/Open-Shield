# openShield — Agent Guide

## Project Overview

openShield is a Chromium browser extension (Manifest V3) that provides privacy protections similar to Brave Shields. It is dependency-free, uses only Web Extension APIs, and stores all data locally.

## Directory Structure

```
├── manifest.json              # MV3 manifest
├── src/
│   ├── core/
│   │   ├── config.js          # Shared constants (ES module)
│   │   └── utils.js           # Shared pure utilities (ES module)
│   ├── background/
│   │   ├── index.js           # Main orchestrator, message router
│   │   ├── settings.js        # Settings engine, counters, block log
│   │   ├── dnr.js             # DNR rule management (toggle, allowlist)
│   │   ├── injections.js      # Self-contained MAIN-world injection functions
│   │   ├── tab-lifecycle.js   # Tab lifecycle (auto-shred, icons, origins)
│   │   ├── filters.js         # ABP→DNR filter conversion + update system
│   │   ├── learning.js        # Heuristic tracker signal processing
│   │   └── cohort.js          # Privacy Badger-style cohort tracking
│   ├── content/
│   │   ├── cosmetic.js        # ISOLATED world CSS ad hiding (document_start)
│   │   ├── bounce.js          # ISOLATED world bounce detection
│   │   ├── link-protection.js # ISOLATED world link tracking param stripping
│   │   ├── click-to-load.js   # ISOLATED world social embed placeholders
│   │   ├── security.js        # ISOLATED world XSS & clickjacking detection
│   │   └── webrtc.js          # MAIN-world WebRTC IP leak prevention
│   └── polyfills/
│       └── browser-polyfill.js # Firefox compatibility shim
├── ui/
│   ├── popup/
│   │   ├── popup.html         # Popup markup with protection badges
│   │   ├── popup.js           # Popup logic (site state, toggle, stats)
│   │   └── popup.css          # Popup styles (dark/light theme)
│   └── options/
│       ├── options.html        # Options page with settings controls
│       ├── options.js          # Options logic (settings, stats, cohort)
│       └── options.css         # Options styles (dark/light theme)
├── rules/
│   ├── easylist.json          # DNR rules (ads)
│   ├── easyprivacy.json       # DNR rules (trackers)
│   ├── params.json            # DNR rules (URL param stripping)
│   ├── https_upgrade.json     # DNR rules (HTTPS upgrade)
│   ├── headers.json           # DNR rules (header modifications)
│   ├── 3p-block.json          # DNR rules (3rd-party script/frame block, disabled by default)
│   └── bounce_domains.json    # Data file for bounce domains
├── icons/                     # PNG icons at 16/32/48/128 for on/off/partial
├── tools/
│   ├── convert-filters.js     # ABP -> DNR converter
│   ├── fetch-lists.js         # Downloads latest filter lists
│   ├── build.js               # Validates and packages extension
│   ├── build-hsts.js          # HSTS rule builder
│   └── extract-cosmetic.js   # Cosmetic filter extractor
└── tests/
    └── unit/
        ├── config.test.js
        ├── utils.test.js
        ├── farbling.test.js
        ├── params.test.js
        ├── background-pure.test.js
        ├── farbling-config.test.js
        ├── convert-rules.test.js
        └── bounce-validate.test.js
```

## Key Constraints

- **Manifest V3**: Service worker (no persistent background page). `declarativeNetRequest` only.
- **No runtime dependencies**: Pure browser APIs only.
- **ES modules**: Background/popup use `import`/`export`. Content scripts are plain IIFE (injected via manifest or `executeScript`).
- **Storage**: `chrome.storage.local` for persistent state; `chrome.storage.session` for per-session counters and seeds.
- **Rule limits**: Max 30,000 static DNR rules total; max 5,000 dynamic rules.

## Coding Standards

- ES2022 syntax
- `async/await` preferred
- JSDoc on exported functions
- camelCase for functions/variables, SCREAMING_SNAKE_CASE for constants
- Event listeners named `handle<Event>`
- No inline scripts or styles in HTML

## Testing

Run unit tests with Node's built-in runner:

```bash
node --test tests/unit/**/*.test.js
```

## Build

```bash
node tools/build.js
```

This validates the manifest and DNR rules, then creates a zip for distribution.

## Notes for Agents

- When modifying background modules, remember the service worker can be terminated at any time. Do not rely on in-memory state — use write-through cache pattern with `chrome.storage.session`.
- Background code is split into 8 modules under `src/background/`. `index.js` is the main orchestrator and message router.
- `installAll` in `injections.js` is the consolidated injection function — single `executeScript` call instead of 4-5 separate ones. It is self-contained because it is serialized by `chrome.scripting.executeScript`. Do not import module variables into it.
- Dynamic DNR rules are used for per-site shields toggle, allowlist, JS blocking, and cohort auto-block. IDs are carefully managed to avoid collisions (see `dnr.js` for ranges).
- Cosmetic script runs at `document_start` to hide ads before first paint.
- Options page now includes full settings controls. `SET_GLOBAL` message handler validates keys against `ALLOWED_GLOBAL_KEYS_SET`.
