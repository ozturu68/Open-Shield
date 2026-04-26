# openShield

> Privacy shield for Chromium browsers. Blocks trackers, ads, and fingerprinting silently — no configuration required.

openShield is a standalone, open-source Chrome extension that replicates the core protections of Brave Shields. It is **dependency-free**, **Manifest V3 compliant**, and **completely transparent** — no telemetry, no cloud sync, no ads.

The extension makes intelligent decisions automatically. You toggle shields on or off per site. Everything else is handled for you.

---

## Features

| Feature | How it works |
|---|---|
| **Ad & Tracker Blocking** | DNR rules block known ad and tracker domains before requests leave the browser |
| **HTTPS Upgrade** | Automatically upgrades HTTP to HTTPS for supported domains |
| **Fingerprint Randomization** | Adds imperceptible noise to Canvas, WebGL, AudioContext, and font APIs |
| **Cookie Blocking** | Strips third-party tracking cookies at the network layer |
| **URL Parameter Stripping** | Removes UTM, `fbclid`, `gclid`, and other tracking parameters from URLs |
| **Bounce Tracking Protection** | Skips tracking redirect intermediaries automatically |
| **Cosmetic Filtering** | Hides ad placeholders instantly in all frames before they render |
| **Auto Shred** | Optionally clear all site data when a tab closes (disabled by default) |

---

## Installation

### From Chrome Web Store
*(Coming soon)*

### From Source

1. Download or clone this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the project folder.
5. The shield icon appears in your toolbar.

---

## Usage

**There is almost nothing to configure.**

- **Shields are on by default** for every site.
- Click the shield icon to see what's been blocked.
- Turn shields off for a specific site if something breaks.
- Open Settings from the popup to change global defaults or manage exceptions.

---

## Privacy Policy

**openShield does not collect any data.** No telemetry. No analytics. No remote configuration. All settings and stats are stored locally in your browser.

---

## Building from Source

```bash
# Fetch latest filter lists
node tools/fetch-lists.js

# Convert to DNR format
node tools/convert-filters.js tools/.cache/easylist.txt rules/easylist.json
node tools/convert-filters.js tools/.cache/easyprivacy.txt rules/easyprivacy.json

# Validate and package
node tools/build.js
```

---

## Contributing

Contributions are welcome. Please open an issue or pull request.

- ES2022 syntax, ESM modules
- No runtime dependencies
- Run tests: `node --test tests/unit/**/*.test.js`

---

## License

MIT License — see [LICENSE](LICENSE).

---

*openShield is not affiliated with Brave Software.*
