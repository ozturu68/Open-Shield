# openShield — Agent Guide

## Project Overview

openShield is a Chromium browser extension (Manifest V3) that provides privacy protections similar to Brave Shields. It is dependency-free, uses only Web Extension APIs, and stores all data locally.

## Directory Structure

```
├── manifest.json              # MV3 manifest
├── src/
│   ├── background.js          # Service worker (state, DNR, farbling injection)
│   ├── cosmetic.js            # ISOLATED world CSS ad hiding (document_start)
│   ├── bounce.js              # ISOLATED world bounce detection
│   ├── config.js              # Shared constants (ES module)
│   └── utils.js               # Shared pure utilities (ES module)
├── popup/
│   ├── popup.html             # Popup markup
│   ├── popup.js               # Popup logic
│   └── popup.css              # Popup styles
├── options/
│   ├── options.html           # Options page markup
│   ├── options.js             # Options logic
│   └── options.css            # Options styles
├── rules/
│   ├── easylist.json          # DNR rules (ads)
│   ├── easyprivacy.json       # DNR rules (trackers)
│   ├── params.json            # DNR rules (URL param stripping)
│   ├── https_upgrade.json     # DNR rules (HTTPS upgrade)
│   ├── headers.json           # DNR rules (header modifications)
│   └── bounce_domains.json    # Data file for bounce domains
├── icons/                     # PNG icons at 16/32/48/128 for on/off/partial
├── tools/
│   ├── convert-filters.js     # ABP -> DNR converter
│   ├── fetch-lists.js         # Downloads latest filter lists
│   └── build.js               # Validates and packages extension
└── tests/
    └── unit/
        ├── config.test.js
        ├── utils.test.js
        ├── farbling.test.js
        └── params.test.js
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

- When modifying `background.js`, remember the service worker can be terminated at any time. Do not rely on in-memory state.
- `installFarbling` in `background.js` is self-contained because it is serialized by `chrome.scripting.executeScript`. Do not import module variables into it.
- Dynamic DNR rules are used for per-site shields toggle and allowlist. IDs are carefully managed to avoid collisions.
- Cosmetic script runs at `document_start` to hide ads before first paint.
