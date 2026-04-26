# Changelog

All notable changes to openShield will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Auto-updating filter lists**: uBlock Origin and AdGuard lists now refresh every 4 days via `chrome.alarms`. Dynamic DNR rules are used for runtime updates.
- **Configurable farbling noise level**: New `fpLevel` setting with "low", "medium", and "high" options controlling the aggressiveness of fingerprinting countermeasures.
- **DNR rule quota monitoring**: Service worker now tracks static and dynamic rule counts, warning when approaching Chrome's limits (30,000 static / 5,000 dynamic).
- **Conditional script injection**: WebRTC and Beacon blocking scripts are now only injected when fingerprinting protection is enabled, reducing CPU overhead on excluded sites.
- **GitHub Actions CI/CD**: Automated linting, testing, security auditing, and JSON validation on push and pull requests.
- **BUILD.md**: Comprehensive build and development setup guide.
- **CHANGELOG.md**: This file.

### Changed
- **Additional filter lists enabled**: AdGuard Base and AdGuard Tracking Protection are now enabled by default, supplementing EasyList, EasyPrivacy, and uBlock Origin lists.
- **Improved fetch-lists.js**: Better error tolerance with malformed line detection and reporting.

## [1.0.0] - 2026-04-26

### Added
- Initial release of openShield.
- **14 protection layers**: Ad/ tracker blocking, fingerprinting protection (canvas, WebGL, audio, font), WebRTC IP leak prevention, beacon/ping blocking, bounce tracking detection, URL parameter stripping, HTTPS upgrade, cosmetic ad hiding (CSS injection), automatic data shredding, DNT/GPC header insertion, third-party cookie blocking, Accept-Language spoofing, per-site shields toggle.
- **Filter lists**: EasyList and EasyPrivacy for ad/tracker blocking (98 static DNR rules).
- **Popup UI**: Site status, toggle, stats, and settings access.
- **Options page**: Global defaults, filter list management, allowlist/blocklist, and about section.
- **Zero dependencies**: Pure Web Extension APIs, no npm runtime dependencies.
- **Zero telemetry**: All data stored locally; no external requests at runtime.
