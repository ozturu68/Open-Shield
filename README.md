<div align="center">
  <br>
  <img src="logo.png" alt="openShield" width="120" height="120">
  <br>
  <h1>openShield</h1>
  <p><strong>Privacy shield for Chromium browsers.</strong> Blocks trackers, ads, fingerprinting, and WebRTC leaks — automatically.</p>
  <p>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-1a73e8.svg" alt="License: MIT"></a>
    <img src="https://img.shields.io/badge/Version-1.0.0-34a853.svg" alt="Version 1.0.0">
    <img src="https://img.shields.io/badge/Manifest-V3-ea4335.svg" alt="Manifest V3">
    <img src="https://img.shields.io/badge/Tests-Passing-34a853.svg" alt="Tests Passing">
  </p>
  <br>
</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Usage](#usage)
- [Privacy Policy](#privacy-policy)
- [Building from Source](#building-from-source)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

---

## Overview

openShield is a standalone, open-source browser extension that brings enterprise-grade privacy protections to any Chromium-based browser — without requiring Brave. It operates silently in the background, making intelligent decisions automatically so you don't have to configure anything.

**Zero telemetry. Zero cloud sync. Zero dependencies.**

---

## Features

| Layer | Protection | Details |
|---|---|---|
| **Network** | Ad & Tracker Blocking | 98 DNR rules blocking 60+ ad/tracker domains before requests leave the browser |
| **Network** | HTTPS Upgrade | Automatic scheme upgrades for HSTS-capable domains |
| **Network** | Cookie Control | Strips third-party `Cookie` and `Set-Cookie` headers |
| **Network** | URL Cleaning | Removes UTM, `fbclid`, `gclid`, and 16 other tracking parameters |
| **Network** | Bounce Bypass | Skips tracking redirect intermediaries (`t.co`, `l.facebook.com`) |
| **Network** | Beacon Block | Neutralizes `navigator.sendBeacon` and `fetch(keepalive)` |
| **Fingerprint** | Canvas Farbling | Imperceptible noise on `toDataURL`, `toBlob`, `getImageData` |
| **Fingerprint** | WebGL Farbling | Spoofs vendor/renderer strings and pixel noise on `readPixels` |
| **Fingerprint** | Audio Farbling | Sub-audible noise on `getChannelData` and frequency data |
| **Fingerprint** | Font Protection | Prevents font enumeration fingerprinting |
| **Fingerprint** | WebRTC Leak Prevention | Filters local IP candidates from RTCPeerConnection |
| **Content** | Cosmetic Filtering | 75 selectors hiding ad placeholders instantly in all frames |
| **Content** | Dynamic Ads | `requestIdleCallback`-batched MutationObserver for SPA ads |
| **Data** | Auto Shred | Optional per-site data clearing on tab close |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     openShield Extension                     │
├─────────────────────────────────────────────────────────────┤
│  Background Service Worker                                   │
│  ├── Per-site config manager (chrome.storage.local)          │
│  ├── Block counter (chrome.storage.session)                  │
│  ├── Dynamic DNR rule manager (shields toggle)               │
│  ├── Bounce tracking detector                                │
│  ├── Farbling / WebRTC / Beacon injection orchestrator       │
│  └── Tab lifecycle manager (Auto Shred)                      │
├─────────────────────────────────────────────────────────────┤
│  Declarative Net Request (Static Rules)                      │
│  ├── easylist.json      — 60 ad/tracker domain blocks       │
│  ├── easyprivacy.json   — 20 privacy tracker blocks         │
│  ├── headers.json       — Cookie/referer/header stripping   │
│  ├── params.json        — URL tracking parameter removal    │
│  └── https_upgrade.json — HSTS upgrade rules                │
├─────────────────────────────────────────────────────────────┤
│  Content Scripts (document_start, all_frames)                │
│  ├── cosmetic.js  — CSS injection for ad hiding             │
│  └── bounce.js    — Bounce domain detection                 │
├─────────────────────────────────────────────────────────────┤
│  MAIN World Injections (via chrome.scripting.executeScript)  │
│  ├── installFarbling    — Canvas/WebGL/Audio noise          │
│  ├── installWebRTCBlock — Local IP leak prevention          │
│  └── installBeaconBlock — sendBeacon/fetch neutralization   │
└─────────────────────────────────────────────────────────────┘
```

---

## Installation

### Chrome Web Store
*Coming soon*

### From Source

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle top-right)
4. Click **Load unpacked** and select the project folder
5. The shield icon appears in your toolbar

```bash
git clone https://github.com/ozturu68/Open-Shield.git
cd Open-Shield
```

---

## Usage

**There is nothing to configure by default.**

- **Shields are on automatically** for every site
- Click the shield icon to see blocked counts and toggle per-site
- Open Settings for global defaults, filter lists, and exceptions

---

## Privacy Policy

**openShield does not collect any data.**

- No telemetry
- No analytics
- No remote configuration
- No cloud sync

All settings, counters, and seeds are stored locally in your browser. The extension never phones home.

---

## Building from Source

### Prerequisites
- Node.js 18+

### Pipeline

```bash
# 1. Fetch latest filter lists from canonical sources
node tools/fetch-lists.js

# 2. Convert network filters to DNR JSON
node tools/convert-filters.js data/.cache/easylist.txt rules/easylist.json
node tools/convert-filters.js data/.cache/easyprivacy.txt rules/easyprivacy.json

# 3. Extract cosmetic selectors
node tools/extract-cosmetic.js data/.cache/easylist.txt

# 4. Build HSTS upgrade rules
node tools/build-hsts.js data/.cache/hsts-preload.json rules/https_upgrade.json

# 5. Validate, test, and package
node tools/build.js
```

The build script validates the manifest, checks all DNR rules for duplicates and completeness, runs unit tests, and creates `openShield-v1.0.0.zip`.

---

## Contributing

Contributions are welcome. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

- ES2022 syntax, ESM modules
- No runtime dependencies
- Run tests: `node --test tests/unit/**/*.test.js`

---

## Security

For security disclosures, please see [SECURITY.md](SECURITY.md).

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

*openShield is not affiliated with Brave Software. Brave Shields is a trademark of Brave Software, Inc.*
