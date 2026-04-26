# openShield — Development Specification
> Version 1.0.0 | Language: English | Target: Chromium-based browsers (MV3)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Philosophy & Design Principles](#2-philosophy--design-principles)
3. [Technical Constraints & Browser API Boundaries](#3-technical-constraints--browser-api-boundaries)
4. [Architecture](#4-architecture)
5. [Feature Specification](#5-feature-specification)
6. [File & Directory Structure](#6-file--directory-structure)
7. [Module Specifications](#7-module-specifications)
8. [Filter List Strategy](#8-filter-list-strategy)
9. [Popup UI Specification](#9-popup-ui-specification)
10. [Options Page Specification](#10-options-page-specification)
11. [Task Breakdown for AI Agents](#11-task-breakdown-for-ai-agents)
12. [Coding Standards](#12-coding-standards)
13. [Testing Protocol](#13-testing-protocol)
14. [Release Checklist](#14-release-checklist)
15. [Glossary](#15-glossary)

---

## 1. Project Overview

### 1.1 What Is openShield?

openShield is a **standalone, open-source, browser-agnostic privacy shield** Chrome extension for Chromium-based browsers (Chrome, Edge, Vivaldi, Opera, Arc, etc.). It replicates the core protective features of Brave Shields — without requiring the Brave browser.

The extension is:
- **Dependency-free at runtime** (no npm packages bundled, pure Web Extension APIs)
- **Manifest V3 compliant** (required by Chrome as of June 2025)
- **Per-site configurable** (users control protections per domain)
- **Transparent** (every blocked request is visible in the popup)
- **Open source** (MIT license, no telemetry, no cloud sync)

### 1.2 Problem Statement

Brave Shields provides best-in-class privacy protections (tracker blocking, fingerprint randomization, HTTPS upgrade, cosmetic filtering). However, it is deeply integrated into the Brave browser — users who prefer Chrome, Edge, or other Chromium-based browsers cannot access these protections without switching browsers entirely. Existing alternatives (uBlock Origin, Privacy Badger) cover only parts of what Brave Shields does and lack its unified UI paradigm.

### 1.3 Target Users

- Privacy-conscious users on Chrome, Edge, Vivaldi, or Arc
- Users who know Brave Shields and want the same experience elsewhere
- Developers who want an open, auditable privacy extension

### 1.4 Non-Goals

The following are explicitly out of scope:
- VPN or proxy functionality
- Password management
- Brave Rewards / BAT token integration
- Firefox support (different extension API surface; separate project)
- Any form of user telemetry or analytics

---

## 2. Philosophy & Design Principles

### 2.1 Core Tenets

| Tenet | Meaning |
|---|---|
| **Function over form** | Every UI element earns its place by serving a user action |
| **Sensible defaults** | Protected out of the box, no configuration required |
| **Per-site granularity** | Shields up globally, adjustable per domain |
| **No vendor lock-in** | Pure Web Extension APIs; installable on any Chromium browser |
| **Auditable** | No minification in source; all logic readable |
| **Zero phoning home** | No telemetry, no remote config, no analytics |

### 2.2 Brave Shields Feature Parity Analysis

The table below maps Brave Shields features to their implementation feasibility in a browser extension (MV3):

| Brave Shields Feature | MV3 Extension Possible? | Implementation Method | Notes |
|---|---|---|---|
| Ad & tracker blocking | ✅ Yes | `declarativeNetRequest` rules | Core feature; full parity |
| HTTPS upgrade | ✅ Yes | `declarativeNetRequest` upgradeScheme action | Limited to known HTTP domains |
| Cookie blocking (3rd party) | ✅ Yes | `declarativeNetRequest` header removal | Cannot modify JS `document.cookie` via DNR |
| Cosmetic filtering (hide ads) | ✅ Yes | Content script CSS injection | Same as uBlock Origin |
| Canvas fingerprint noise | ✅ Yes | Content script API interception (MAIN world) | Session-scoped random seed |
| WebGL fingerprint noise | ✅ Yes | Content script API interception (MAIN world) | Same approach |
| AudioContext fingerprint noise | ✅ Yes | Content script API interception (MAIN world) | Same approach |
| Font fingerprint mitigation | ⚠️ Partial | Cannot enumerate installed fonts; can fake `measureText` | Limited |
| Language fingerprint reduction | ⚠️ Partial | `declarativeNetRequest` header modification for Accept-Language | Cannot affect navigator.language |
| User-Agent reduction | ⚠️ Partial | Header modification; not JS-side without detection risk | |
| Bounce tracking / debounce | ✅ Yes | `webNavigation` listener + URL rewriting | Redirect chains detectable |
| URL tracking param stripping | ✅ Yes | `declarativeNetRequest` redirect with regex | UTM params, fbclid, etc. |
| JavaScript blocking (per-site) | ✅ Yes | `declarativeNetRequest` block + `scripting` injection | |
| Phishing/malware blocking | ⚠️ Partial | Static list only (no Safe Browsing API access) | Limited without Google API |
| Per-site Shields toggle | ✅ Yes | `chrome.storage.local` per-origin config | Core feature |
| Block count display | ✅ Yes | `chrome.storage.session` counters per tab | |
| Auto Shred (clear site data) | ✅ Yes | `browsingData` API on tab close | |

### 2.3 UX Inspiration

The popup UI should feel like a refined, browser-agnostic version of Brave Shields. Key UX decisions:
- Shield icon in the toolbar reflects current protection state (green = on, gray = off, orange = partial)
- Click the icon → popup shows current site's protection summary + counts
- One toggle to disable all protections for the current site
- Expandable sections for granular control
- Options page for global settings, filter list management, and allowlist

---

## 3. Technical Constraints & Browser API Boundaries

### 3.1 Manifest V3 Limitations (Critical Reading)

MV3 imposes hard constraints that shape the entire architecture:

**`declarativeNetRequest` (DNR) replaces `webRequest`:**
- Rules are static JSON — no dynamic per-request logic
- Maximum 30,000 static rules across all rulesets
- Maximum 5,000 dynamic rules (set at runtime via `updateDynamicRules`)
- No access to response bodies
- Cannot inspect request headers at runtime for algorithmic decisions

**Service Worker (replaces background page):**
- Can be terminated by the browser at any time (no persistent state in memory)
- All persistent state MUST go in `chrome.storage` (local or session)
- `chrome.storage.session` is cleared on browser restart; use for per-session counters
- `chrome.storage.local` persists across restarts; use for user settings
- No DOM access in the service worker

**Content Scripts:**
- Run in an isolated world by default (`ISOLATED` world) — cannot access page JS context
- To intercept page-level APIs (Canvas, WebGL, AudioContext), scripts must run in `MAIN` world
- `MAIN` world injection requires `"scripting"` permission and is done via `chrome.scripting.executeScript`
- Content scripts injected at `document_start` run before page scripts — critical for fingerprint interception
- Cannot use ES modules in content scripts injected via manifest `content_scripts` array

**Permissions:**
- `declarativeNetRequest` — required for all network-level blocking
- `declarativeNetRequestFeedback` — required to read which rules were matched (for block counts)
- `storage` — required for `chrome.storage`
- `tabs` — required to get current tab URL in popup
- `scripting` — required for `executeScript` (MAIN world injection)
- `webNavigation` — required for bounce tracking detection
- `<all_urls>` host permission — required for DNR to apply to all sites

### 3.2 Fingerprint Protection via Content Scripts

This is the most technically complex part. Explanation for AI agents:

When a page loads, it runs JavaScript that can call `HTMLCanvasElement.prototype.toDataURL()` to extract pixel data and build a fingerprint. To prevent this, openShield must intercept the call *before* the page's script runs.

The sequence is:
1. `manifest.json` declares a content script with `run_at: "document_start"` and `world: "MAIN"`
2. This script runs **before any page script**, in the page's own JS execution context
3. The script wraps the native API: saves the original, replaces it with a proxy that adds deterministic noise, then calls the original
4. The noise seed is generated **once per session per origin** so noise is consistent within a session (pages work correctly) but differs across sessions and origins (fingerprint changes)

**APIs to intercept:**
- `HTMLCanvasElement.prototype.toDataURL`
- `HTMLCanvasElement.prototype.toBlob`
- `CanvasRenderingContext2D.prototype.getImageData`
- `WebGLRenderingContext.prototype.getParameter`
- `WebGL2RenderingContext.prototype.getParameter`
- `WebGLRenderingContext.prototype.readPixels`
- `AudioBuffer.prototype.getChannelData`
- `AnalyserNode.prototype.getFloatFrequencyData`
- `AnalyserNode.prototype.getByteFrequencyData`

### 3.3 DNR Rule Limits and Strategy

With 30,000 max static rules, we must prioritize. Allocation plan:

| Ruleset | File | Estimated Rules | Priority |
|---|---|---|---|
| EasyList (ads) | `rules/easylist.json` | ~15,000 | High |
| EasyPrivacy (trackers) | `rules/easyprivacy.json` | ~8,000 | High |
| URL param stripping | `rules/params.json` | ~200 | High |
| HTTPS upgrade | `rules/https_upgrade.json` | ~1,000 | Medium |
| Anti-fingerprint headers | `rules/headers.json` | ~50 | Medium |
| Custom user rules | Dynamic rules | up to 5,000 | User |

Filter lists must be **pre-converted** from Adblock Plus syntax to DNR JSON format at build time — not at runtime (DNR rules are static). A build script handles this conversion.

---

## 4. Architecture

### 4.1 High-Level Component Map

```
┌─────────────────────────────────────────────────────┐
│                  openShield Extension                │
│                                                      │
│  ┌─────────────┐    ┌──────────────────────────┐    │
│  │  popup.html  │    │     options.html          │    │
│  │  (per-site   │    │  (global settings,        │    │
│  │   controls)  │    │   filter lists, log)      │    │
│  └──────┬───────┘    └────────────┬─────────────┘    │
│         │ chrome.runtime.sendMessage                  │
│         ▼                         ▼                   │
│  ┌─────────────────────────────────────────────────┐  │
│  │            background.js (service worker)        │  │
│  │  - Per-site config manager                       │  │
│  │  - Block counter (storage.session)               │  │
│  │  - DNR ruleset enable/disable per site           │  │
│  │  - Bounce tracking detector                      │  │
│  │  - Tab lifecycle (Auto Shred)                    │  │
│  │  - Filter list update scheduler                  │  │
│  └─────────────────────────────────────────────────┘  │
│         │                         │                   │
│         ▼ DNR                     ▼ scripting API     │
│  ┌──────────────┐    ┌─────────────────────────────┐  │
│  │ DNR Rulesets │    │     Content Scripts          │  │
│  │ (static JSON)│    │  farbling.js  (MAIN world)   │  │
│  │ easylist     │    │  cosmetic.js  (ISOLATED)     │  │
│  │ easyprivacy  │    │  bounce.js    (ISOLATED)     │  │
│  │ params       │    └─────────────────────────────┘  │
│  │ https        │                                     │
│  │ headers      │                                     │
│  └──────────────┘                                     │
└─────────────────────────────────────────────────────┘
         │
         ▼ chrome.storage
┌─────────────────────────────────────────────────────┐
│  storage.local:  siteSettings, globalSettings,       │
│                  customRules, filterListMeta          │
│  storage.session: tabCounters, sessionSeeds          │
└─────────────────────────────────────────────────────┘
```

### 4.2 Data Flow: Blocking a Tracker

1. Page requests `https://tracker.example.com/pixel.gif`
2. Chrome checks DNR rulesets — rule in `easyprivacy.json` matches
3. Request is blocked (DNR action: `block`)
4. `chrome.declarativeNetRequest.onRuleMatchedDebug` fires (requires `declarativeNetRequestFeedback`)
5. `background.js` listener increments `tabCounters[tabId].blocked`
6. Badge text on toolbar icon updates
7. User opens popup → sees the count and list of blocked domains

### 4.3 Data Flow: Fingerprint Protection

1. New tab opens to `https://news.example.com`
2. `background.js` receives `webNavigation.onCommitted`
3. Checks `siteSettings["news.example.com"].fingerprintingEnabled` (defaults to true)
4. If enabled: generates or retrieves `sessionSeed` for this origin from `storage.session`
5. Calls `chrome.scripting.executeScript({ world: "MAIN", func: installFarbling, args: [seed] })`
6. `farbling.js` patches all fingerprintable APIs with noise derived from `seed`
7. Tracker reads canvas → gets stable-within-session but cross-session-random result

### 4.4 State Management

All persistent state lives in `chrome.storage`. The service worker has no in-memory state between invocations.

**`chrome.storage.local` schema:**

```json
{
  "globalSettings": {
    "adsTrackers": "standard",
    "httpsUpgrade": true,
    "fingerprinting": true,
    "cookieBlocking": "third-party",
    "javascriptBlocking": false,
    "bounceTracking": true,
    "urlParamStripping": true,
    "autoShred": false,
    "cosmeticFiltering": true
  },
  "siteSettings": {
    "example.com": {
      "shieldsEnabled": false,
      "adsTrackers": "off",
      "fingerprinting": false
    }
  },
  "filterListMeta": {
    "easylist": { "lastUpdated": 1700000000, "etag": "abc123", "enabled": true },
    "easyprivacy": { "lastUpdated": 1700000000, "etag": "def456", "enabled": true }
  },
  "customAllowlist": ["mydomain.com", "work.internal"],
  "customBlocklist": ["spysite.com"]
}
```

**`chrome.storage.session` schema:**

```json
{
  "tabCounters": {
    "123": { "blocked": 42, "fingerprints": 7, "upgraded": 3 }
  },
  "sessionSeeds": {
    "example.com": "a3f9c12b"
  }
}
```

---

## 5. Feature Specification

### 5.1 Feature: Ad & Tracker Blocking

**ID:** F-01  
**Priority:** P0 (must have)

**Description:** Block network requests to known ad and tracker domains using DNR static rulesets derived from EasyList and EasyPrivacy.

**Modes:**
- `standard`: Block third-party ads and trackers
- `aggressive`: Also block first-party trackers (may break some sites)
- `off`: Disable blocking for this site

**Implementation:**
- Convert EasyList/EasyPrivacy to DNR JSON at build time using `tools/convert-filters.js`
- Enable/disable rulesets globally via `chrome.declarativeNetRequest.updateEnabledRulesets`
- Per-site override: add dynamic rule `{ action: { type: "allow" }, condition: { initiatorDomains: ["example.com"] } }` when shields are off for a site

**Acceptance Criteria:**
- [ ] Requests to domains in EasyPrivacy are blocked on all sites when set to standard
- [ ] Badge count increments for each blocked request
- [ ] Turning shields off for a site stops all blocking on that site only
- [ ] Other sites continue to be protected

---

### 5.2 Feature: HTTPS Upgrade

**ID:** F-02  
**Priority:** P0 (must have)

**Description:** Automatically upgrade HTTP requests to HTTPS for known domains.

**Implementation:**
- Use DNR action `upgradeScheme` on a curated list of domains known to support HTTPS
- Source list: HSTS preload list (subset, at build time)
- Fallback: if HTTPS fails, the browser's normal error page shows (do not silently fall back to HTTP)

**Acceptance Criteria:**
- [ ] Navigation to `http://example.com` redirects to `https://example.com` for domains in ruleset
- [ ] Non-HTTPS-capable domains are not upgraded (no error loops)
- [ ] Upgrade count shown in popup

---

### 5.3 Feature: Fingerprint Randomization ("Farbling")

**ID:** F-03  
**Priority:** P0 (must have)

**Description:** Intercept and add deterministic per-session, per-origin noise to all major browser fingerprinting APIs.

**Noise Strategy (matching Brave's "farbling" concept):**
- Seed = `HMAC(sessionId, origin)` — deterministic within a session for a given origin, random across sessions
- Canvas: add ±1 to random pixel values in the output buffer (imperceptible visually)
- WebGL renderer/vendor strings: replace with generic strings (`"WebKit WebGL"`, `"WebKit"`)
- AudioContext: add tiny noise (< 0.0001) to float sample data
- Font measurement: add ±0.5px noise to `measureText` width results

**APIs intercepted:**
```
HTMLCanvasElement.prototype.toDataURL
HTMLCanvasElement.prototype.toBlob
CanvasRenderingContext2D.prototype.getImageData
WebGLRenderingContext.prototype.getParameter
WebGL2RenderingContext.prototype.getParameter
WebGLRenderingContext.prototype.readPixels
WebGL2RenderingContext.prototype.readPixels
AudioBuffer.prototype.getChannelData
AnalyserNode.prototype.getFloatFrequencyData
AnalyserNode.prototype.getByteFrequencyData
CanvasRenderingContext2D.prototype.measureText
```

**Critical Implementation Notes:**
- Script MUST run in `MAIN` world at `document_start`
- The wrapped function must pass `Function.prototype.toString` checks (return `[native code]`)
- Use `Object.defineProperty` to make intercepts non-configurable where possible
- Seed must be passed from background to content script (cannot be derived in MAIN world without leaking to page)

**Acceptance Criteria:**
- [ ] Canvas fingerprint differs between browser sessions for the same site
- [ ] Canvas fingerprint is the same within a single session for the same site (stability)
- [ ] `Function.prototype.toString(HTMLCanvasElement.prototype.toDataURL)` returns `"function toDataURL() { [native code] }"`
- [ ] No visible canvas rendering artifacts

---

### 5.4 Feature: Cookie Blocking

**ID:** F-04  
**Priority:** P1 (should have)

**Description:** Block or restrict cookies by party context.

**Modes:**
- `third-party`: Block `Set-Cookie` and `Cookie` headers for third-party requests (default)
- `all`: Block all cookies
- `off`: Allow all cookies

**Implementation:**
- Use DNR `modifyHeaders` action to remove `Cookie` request header and `Set-Cookie` response header
- Condition: `domainType: "thirdParty"` for third-party mode
- Cannot touch JS-side `document.cookie` from DNR; cosmetic/ISOLATED script can block JS cookie writes if needed (lower priority)

**Acceptance Criteria:**
- [ ] Third-party `Set-Cookie` headers are stripped in standard mode
- [ ] First-party cookies work normally (login sessions persist)
- [ ] Count of stripped cookies visible in popup

---

### 5.5 Feature: URL Tracking Parameter Stripping

**ID:** F-05  
**Priority:** P1 (should have)

**Description:** Remove known tracking query parameters from URLs before navigation.

**Parameters to strip (non-exhaustive initial list):**
```
utm_source, utm_medium, utm_campaign, utm_term, utm_content,
fbclid, gclid, gclsrc, dclid, msclkid, yclid,
mc_eid, mc_cid, _openstat, igshid,
ref, source, affiliate_id, partner_id
```

**Implementation:**
- DNR `redirect` action with `regexSubstitution`
- One rule per parameter (or combined regex groups)
- Strip from both navigation requests and sub-resource requests

**Acceptance Criteria:**
- [ ] Navigation to `https://example.com/?utm_source=google&id=123` becomes `https://example.com/?id=123`
- [ ] Multiple parameters stripped in one redirect
- [ ] Non-tracking parameters preserved

---

### 5.6 Feature: Bounce Tracking Protection

**ID:** F-06  
**Priority:** P1 (should have)

**Description:** Detect and skip known tracking redirect intermediaries.

**Implementation:**
- Maintain a list of known bounce-tracking domains (e.g., `l.facebook.com`, `t.co`, `ow.ly`)
- Use `webNavigation.onBeforeNavigate` to inspect navigation target
- If target domain is in bounce list: extract the final destination URL from query params and redirect there directly using `chrome.tabs.update`

**Acceptance Criteria:**
- [ ] Click on `https://l.facebook.com/l.php?u=https%3A%2F%2Fexample.com` navigates directly to `https://example.com`
- [ ] Normal redirects (301/302) are unaffected
- [ ] Bounce skip count shown in popup

---

### 5.7 Feature: Cosmetic Filtering

**ID:** F-07  
**Priority:** P1 (should have)

**Description:** Inject CSS to hide ad placeholders and empty ad containers that survive network blocking.

**Implementation:**
- Pre-convert EasyList cosmetic filters to CSS rules at build time
- Content script (ISOLATED world) injects `<style>` tag with these rules at `document_start`
- Use `MutationObserver` to handle dynamically inserted ad elements

**Acceptance Criteria:**
- [ ] Common ad placeholder divs are hidden (no blank boxes where ads were)
- [ ] No visible content is hidden (site-specific false positives must be avoidable)
- [ ] Works on dynamically loaded content

---

### 5.8 Feature: JavaScript Blocking (Per-Site)

**ID:** F-08  
**Priority:** P2 (nice to have)

**Description:** Block all JavaScript execution on the current site.

**Implementation:**
- DNR rule: block all requests with `resourceTypes: ["script"]` for the specified domain
- Inject a `<meta http-equiv="Content-Security-Policy">` via content script to block inline scripts

**Acceptance Criteria:**
- [ ] No JS files load on the page when JS blocking is enabled for the site
- [ ] Inline scripts do not execute
- [ ] Easily toggleable per-site in the popup (with a warning about site breakage)

---

### 5.9 Feature: Auto Shred

**ID:** F-09  
**Priority:** P2 (nice to have)

**Description:** Clear all site data (cookies, cache, localStorage) when the user closes a tab for that site.

**Implementation:**
- `chrome.tabs.onRemoved` listener in service worker
- Look up the tab's origin from stored tab info
- Check if `autoShred` is enabled globally or for that origin
- Call `chrome.browsingData.remove({ origins: [origin] }, { cookies: true, localStorage: true, cacheStorage: true })`

**Acceptance Criteria:**
- [ ] Closing a tab for a site with Auto Shred enabled clears its cookies and localStorage
- [ ] Other sites' data is not affected
- [ ] The tab closing is not delayed noticeably

---

### 5.10 Feature: Per-Site Shields Toggle

**ID:** F-10  
**Priority:** P0 (must have)

**Description:** Let users disable all protections for the current site with one toggle.

**Implementation:**
- Popup reads current tab's hostname
- Toggle writes to `siteSettings[hostname].shieldsEnabled = false`
- Background service worker adds a blanket `allow` dynamic DNR rule for that initiator domain
- Fingerprinting content script checks the setting before installing hooks

**Acceptance Criteria:**
- [ ] Toggling shields off immediately stops all blocking on that tab (may require reload prompt)
- [ ] Shields remain on for all other sites
- [ ] The popup shows a clear "Shields Off" state with a distinct icon/color

---

## 6. File & Directory Structure

```
openShield/
│
├── manifest.json                    # MV3 manifest
│
├── src/
│   ├── background.js                # Service worker entry point
│   ├── farbling.js                  # Fingerprint API interception (MAIN world)
│   ├── cosmetic.js                  # CSS cosmetic filter injector (ISOLATED)
│   ├── bounce.js                    # Bounce tracking detector (ISOLATED)
│   ├── config.js                    # Shared constants (imported by bg and popup)
│   └── utils.js                     # Shared utility functions
│
├── popup/
│   ├── popup.html                   # Popup markup
│   ├── popup.js                     # Popup logic
│   └── popup.css                    # Popup styles
│
├── options/
│   ├── options.html                 # Options page markup
│   ├── options.js                   # Options page logic
│   └── options.css                  # Options page styles
│
├── rules/
│   ├── easylist.json                # Pre-converted DNR rules (ads)
│   ├── easyprivacy.json             # Pre-converted DNR rules (trackers)
│   ├── params.json                  # URL tracking param stripping rules
│   ├── https_upgrade.json           # HTTPS upgrade rules
│   ├── headers.json                 # Header modification rules (fingerprint headers)
│   └── bounce_domains.json          # Bounce tracking domain list
│
├── icons/
│   ├── shield-on.png                # 16, 32, 48, 128 px versions
│   ├── shield-off.png               # Grayed-out version
│   └── shield-partial.png           # Orange version (some protections off)
│
├── tools/                           # Build-time tools (not included in extension)
│   ├── convert-filters.js           # Converts ABP syntax → DNR JSON
│   ├── fetch-lists.js               # Downloads latest filter lists
│   └── build.js                     # Assembles and validates the extension
│
├── tests/
│   ├── unit/
│   │   ├── farbling.test.js         # Tests for fingerprint noise
│   │   ├── params.test.js           # Tests for URL param stripping
│   │   └── config.test.js           # Tests for settings defaults
│   └── integration/
│       └── blocking.test.js         # End-to-end blocking tests (Playwright)
│
├── DEVELOPMENT_SPEC.md              # This document
├── CONTRIBUTING.md                  # Contributor guide
├── LICENSE                          # MIT
└── README.md                        # User-facing documentation
```

---

## 7. Module Specifications

### 7.1 `manifest.json`

```json
{
  "manifest_version": 3,
  "name": "openShield",
  "version": "1.0.0",
  "description": "Privacy shield for Chromium browsers. Blocks trackers, ads, fingerprinting. No Brave required.",
  "permissions": [
    "declarativeNetRequest",
    "declarativeNetRequestFeedback",
    "storage",
    "tabs",
    "scripting",
    "webNavigation",
    "browsingData"
  ],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "src/background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/cosmetic.js", "src/bounce.js"],
      "run_at": "document_start",
      "world": "ISOLATED"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/shield-on-16.png",
      "32": "icons/shield-on-32.png",
      "48": "icons/shield-on-48.png",
      "128": "icons/shield-on-128.png"
    }
  },
  "options_ui": {
    "page": "options/options.html",
    "open_in_tab": true
  },
  "declarative_net_request": {
    "rule_resources": [
      { "id": "easylist", "enabled": true, "path": "rules/easylist.json" },
      { "id": "easyprivacy", "enabled": true, "path": "rules/easyprivacy.json" },
      { "id": "params", "enabled": true, "path": "rules/params.json" },
      { "id": "https_upgrade", "enabled": true, "path": "rules/https_upgrade.json" },
      { "id": "headers", "enabled": true, "path": "rules/headers.json" }
    ]
  },
  "web_accessible_resources": []
}
```

---

### 7.2 `src/background.js`

**Responsibilities:**
- Initialize default settings on install
- Listen for `chrome.declarativeNetRequest.onRuleMatchedDebug` → update tab counters
- Listen for `chrome.tabs.onUpdated` → update popup badge
- Listen for `chrome.tabs.onRemoved` → Auto Shred
- Listen for `chrome.webNavigation.onCommitted` → inject farbling script
- Handle messages from popup (`getTabState`, `setSiteSetting`, `setGlobalSetting`)

**Key Functions:**

```javascript
// Called on chrome.runtime.onInstalled
async function initializeDefaults()

// Returns merged settings for a given hostname (site overrides global)
async function getEffectiveSettings(hostname)

// Injects farbling.js into the active tab with the correct seed
async function injectFarbling(tabId, hostname)

// Adds or removes a blanket allow rule for a site
async function setShieldsForSite(hostname, enabled)

// Handles clearing site data on tab close
async function handleAutoShred(tabId, url)

// Updates the extension badge text and icon for a tab
async function updateBadge(tabId)

// Message router
chrome.runtime.onMessage.addListener((message, sender, sendResponse)
```

**Message Protocol:**

Messages from popup → background:

```javascript
// Get current state for popup display
{ type: "GET_TAB_STATE", tabId: number }
// Response:
{ hostname: string, settings: SiteSettings, counts: TabCounters }

// Update a per-site setting
{ type: "SET_SITE_SETTING", hostname: string, key: string, value: any }

// Update a global setting
{ type: "SET_GLOBAL_SETTING", key: string, value: any }

// Get the blocked request log for a tab
{ type: "GET_BLOCK_LOG", tabId: number }
// Response: Array<{ url: string, ruleId: number, timestamp: number }>
```

---

### 7.3 `src/farbling.js`

**World:** `MAIN`  
**Run at:** `document_start`  
**Injection:** Dynamic, via `chrome.scripting.executeScript` from background

This script is injected as a function with the session seed passed as an argument:

```javascript
function installFarbling(seed) {
  // Deterministic pseudo-random number generator seeded per-origin per-session
  function prng(n) { /* LCG or xorshift based on seed + n */ }

  // Intercept canvas
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
    value: function toDataURL(...args) {
      const result = originalToDataURL.apply(this, args);
      // Add noise to base64 pixel data
      return addCanvasNoise(result, seed);
    }
  });

  // ... similar wrappers for all APIs listed in F-03

  // Make toString lie
  const nativeToString = Function.prototype.toString;
  Object.defineProperty(Function.prototype, 'toString', {
    value: function toString() {
      if (this === HTMLCanvasElement.prototype.toDataURL) {
        return 'function toDataURL() { [native code] }';
      }
      // ... other intercepted functions
      return nativeToString.call(this);
    }
  });
}
```

**Noise algorithm for canvas:**
- Convert base64 data URL to Uint8Array
- For every Nth pixel (N derived from seed, e.g., every 50th pixel), flip 1 bit in the alpha or blue channel
- Mutation is imperceptible but changes the hash result significantly
- Re-encode to base64

---

### 7.4 `src/cosmetic.js`

**World:** `ISOLATED`  
**Run at:** `document_start`

Injects CSS cosmetic filters. The list of CSS selectors is compiled at build time into this file as a constant.

```javascript
const COSMETIC_SELECTORS = [
  ".ad-container", "#ad-banner", "[class*='sponsored']",
  // ... thousands of selectors from EasyList
];

// Inject as a style element
const style = document.createElement('style');
style.textContent = COSMETIC_SELECTORS.join(', ') + ' { display: none !important; }';
(document.head || document.documentElement).appendChild(style);

// Watch for dynamically added elements
const observer = new MutationObserver(() => {
  // Re-check newly added nodes against COSMETIC_SELECTORS
});
observer.observe(document.documentElement, { childList: true, subtree: true });
```

---

### 7.5 `src/bounce.js`

**World:** `ISOLATED`  
**Run at:** `document_start`

Detects if the current page is a known bounce-tracking intermediary and communicates to background.

```javascript
// Loaded from rules/bounce_domains.json at build time
const BOUNCE_DOMAINS = ["l.facebook.com", "t.co", "ow.ly", ...];

const hostname = location.hostname;
if (BOUNCE_DOMAINS.includes(hostname)) {
  // Try to extract the final destination URL from query params
  const params = new URLSearchParams(location.search);
  const destination = params.get('u') || params.get('url') || params.get('next');
  if (destination) {
    chrome.runtime.sendMessage({ type: "BOUNCE_DETECTED", destination });
  }
}
```

Background listens for `BOUNCE_DETECTED` and uses `chrome.tabs.update` to redirect.

---

### 7.6 `src/config.js`

Shared constants. Imported by both background and popup.

```javascript
export const DEFAULT_GLOBAL_SETTINGS = {
  adsTrackers: "standard",   // "standard" | "aggressive" | "off"
  httpsUpgrade: true,
  fingerprinting: true,
  cookieBlocking: "third-party", // "third-party" | "all" | "off"
  javascriptBlocking: false,
  bounceTracking: true,
  urlParamStripping: true,
  autoShred: false,
  cosmeticFiltering: true
};

export const STORAGE_KEYS = {
  GLOBAL: "globalSettings",
  SITES: "siteSettings",
  FILTER_META: "filterListMeta",
  ALLOWLIST: "customAllowlist",
  BLOCKLIST: "customBlocklist"
};

export const FILTER_LISTS = {
  easylist: {
    url: "https://easylist.to/easylist/easylist.txt",
    id: "easylist",
    label: "EasyList (Ads)"
  },
  easyprivacy: {
    url: "https://easylist.to/easylist/easyprivacy.txt",
    id: "easyprivacy",
    label: "EasyPrivacy (Trackers)"
  }
};

export const MESSAGE_TYPES = {
  GET_TAB_STATE: "GET_TAB_STATE",
  SET_SITE_SETTING: "SET_SITE_SETTING",
  SET_GLOBAL_SETTING: "SET_GLOBAL_SETTING",
  GET_BLOCK_LOG: "GET_BLOCK_LOG",
  BOUNCE_DETECTED: "BOUNCE_DETECTED"
};
```

---

## 8. Filter List Strategy

### 8.1 Source Lists

| List | URL | Format | Use |
|---|---|---|---|
| EasyList | `https://easylist.to/easylist/easylist.txt` | ABP | Ad blocking network rules |
| EasyPrivacy | `https://easylist.to/easylist/easyprivacy.txt` | ABP | Tracker blocking |
| uBlock Origin Filters | `https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt` | ABP | Additional tracker rules |
| HSTS Preload (subset) | Chrome source | JSON | HTTPS upgrade domains |

### 8.2 Build-Time Conversion

The `tools/convert-filters.js` script:

1. Reads a `.txt` filter list in ABP syntax
2. Parses each rule with the following mapping:

| ABP syntax | DNR action | DNR condition |
|---|---|---|
| `||example.com^` | `block` | `urlFilter: "||example.com^"` or `initiatorDomains` |
| `||example.com^$third-party` | `block` | + `domainType: "thirdParty"` |
| `@@||example.com^` | `allow` | (whitelist) |
| `##.selector` | (skip — cosmetic, handled by cosmetic.js) | |
| `/regex/` | `block` | `regexFilter` |

3. Deduplicates and sorts rules
4. Outputs valid DNR JSON array
5. Validates against the 30,000-rule limit; truncates with a warning if exceeded

### 8.3 Runtime Update Flow (Future Enhancement)

Filter lists should be updatable without a full extension update:

1. Background checks `filterListMeta.lastUpdated` on browser startup
2. If older than 7 days: fetches new list from source URL
3. Converts new list to DNR JSON (in service worker — computationally expensive, should use `setTimeout` chunking)
4. Stores new rules via `chrome.declarativeNetRequest.updateDynamicRules` (limited to 5,000 dynamic rules)
5. Updates `filterListMeta.lastUpdated` and `etag`

**Note:** Full static ruleset updates require an extension update. Dynamic rules cover only the delta. This is a known MV3 limitation.

---

## 9. Popup UI Specification

### 9.1 Layout & States

The popup is **400px wide** and has three states:

**State A — Shields ON (default):**
```
┌────────────────────────────────────────┐
│ 🛡 openShield        [●ON] [settings] │
│ example.com                            │
├────────────────────────────────────────┤
│ 42 items blocked this session          │
│                                        │
│ [Ads & Trackers    ◉ Standard  ▾]     │
│ [Fingerprinting    ◉ On         ]      │
│ [HTTPS Upgrade     ◉ On         ]      │
│ [Cookie Control    ◉ 3rd Party  ]      │
│                                        │
│ [▼ Show blocked requests (42)]         │
└────────────────────────────────────────┘
```

**State B — Shields OFF:**
```
┌────────────────────────────────────────┐
│ 🛡 openShield        [○OFF] [settings]│
│ example.com                            │
├────────────────────────────────────────┤
│ ⚠ Shields are disabled for this site  │
│   All protections paused               │
│                                        │
│           [Turn shields on]            │
└────────────────────────────────────────┘
```

**State C — Restricted page (chrome://, extension://):**
```
┌────────────────────────────────────────┐
│ 🛡 openShield                          │
├────────────────────────────────────────┤
│ Cannot apply shields to browser pages  │
└────────────────────────────────────────┘
```

### 9.2 Interactive Elements

| Element | Behavior |
|---|---|
| Shields toggle | Writes `siteSettings[hostname].shieldsEnabled`, triggers page reload prompt |
| Ads & Trackers dropdown | `standard` / `aggressive` / `off` — writes to site settings |
| Fingerprinting toggle | On/Off per site |
| HTTPS toggle | On/Off per site |
| Cookie control toggle | `third-party` / `all` / `off` |
| Blocked requests accordion | Expands to show a list of blocked domain names and count |
| Settings gear icon | Opens `options.html` in a new tab |

### 9.3 Popup Technical Notes

- Popup HTML must not contain inline JS (CSP restriction in MV3)
- All event listeners attached in `popup.js`
- Popup communicates with background via `chrome.runtime.sendMessage`
- Do not use `localStorage` — use `chrome.storage` only
- Popup must close and reopen correctly (no state persisted in popup JS)
- Popup must display correctly in both light and dark OS themes

---

## 10. Options Page Specification

### 10.1 Sections

**Section 1: Global Defaults**
- Same controls as the popup, but for global defaults
- These apply when there is no site-specific override

**Section 2: Filter Lists**
- Table showing each filter list: name, last updated date, enabled toggle
- Button: "Check for updates"
- Button: "Add custom filter list" (URL input)

**Section 3: Allowlist / Blocklist**
- Allowlist: domains where shields are permanently off
- Blocklist: domains that are always blocked regardless of other settings
- Each as a textarea (one domain per line) with Save button

**Section 4: Privacy Report**
- Aggregate stats: total blocked since install, breakdown by category
- Stats are stored in `chrome.storage.local` (persists across restarts)

**Section 5: About**
- Version number, link to GitHub, MIT license notice

---

## 11. Task Breakdown for AI Agents

> Each task is self-contained. An AI agent can be assigned one task at a time. Tasks have clear inputs, outputs, and acceptance criteria.

### TASK-001: Scaffold the extension

**Input:** This specification document  
**Output:** Complete directory structure with all empty files created  
**Files to create:**
- `manifest.json` (populated per spec §7.1)
- All directories: `src/`, `popup/`, `options/`, `rules/`, `icons/`, `tools/`, `tests/`
- Empty placeholder files for all modules listed in §6

**Acceptance:**
- `manifest.json` is valid (Chrome extension validator passes)
- Directory structure matches §6 exactly

---

### TASK-002: Implement `src/config.js`

**Input:** §7.6  
**Output:** `src/config.js` with all exports  
**Acceptance:**
- All constants exported as named exports
- No default export
- File uses ES module syntax (`export const`)
- No dependencies on browser APIs

---

### TASK-003: Implement `src/utils.js`

**Input:** Needs from other modules  
**Output:** `src/utils.js` with shared utility functions

**Functions to implement:**

```javascript
// Extract hostname from a URL string. Returns null if invalid.
export function getHostname(url)

// Returns true if url is a chrome:// or extension:// URL
export function isBrowserPage(url)

// Generates a random 8-character hex string
export function generateSeed()

// Returns a pseudo-random float in [0, 1) derived from seed and a counter
export function seededRandom(seed, counter)

// Deep merge two objects (for settings merging)
export function mergeSettings(base, override)
```

**Acceptance:**
- 100% test coverage in `tests/unit/utils.test.js`
- `getHostname("https://example.com/path?q=1")` returns `"example.com"`
- `isBrowserPage("chrome://extensions")` returns `true`
- `seededRandom("abc123", 0) !== seededRandom("abc123", 1)` (different outputs for different counters)
- `seededRandom("abc123", 0) === seededRandom("abc123", 0)` (same output for same inputs)

---

### TASK-004: Implement `src/background.js` — initialization

**Input:** §7.2, §4.4 (storage schema)  
**Output:** Background service worker that correctly initializes on install

**Scope of this task:** Only the `chrome.runtime.onInstalled` handler and `initializeDefaults` function.

**Behavior:**
1. Check if `globalSettings` exists in `chrome.storage.local`
2. If not: write `DEFAULT_GLOBAL_SETTINGS` to storage
3. If yes: merge with defaults (add any missing keys from a new version)
4. Log initialization complete

**Acceptance:**
- Fresh install: storage contains `globalSettings` with all defaults
- Upgrade install: existing user settings are not overwritten; only new keys are added
- No errors in browser console on install

---

### TASK-005: Implement `src/background.js` — message handling

**Input:** §7.2 (message protocol), `config.js`  
**Output:** `chrome.runtime.onMessage` handler in background.js

**Messages to handle:**
- `GET_TAB_STATE` → retrieve settings + counters for tab, respond synchronously
- `SET_SITE_SETTING` → write to `siteSettings[hostname]` in storage
- `SET_GLOBAL_SETTING` → write to `globalSettings` in storage

**Acceptance:**
- `GET_TAB_STATE` response includes `{ hostname, settings, counts }` with correct types
- `SET_SITE_SETTING` correctly merges into existing site settings (does not overwrite other keys)
- Message handler returns `true` to keep the message channel open for async responses

---

### TASK-006: Implement `src/background.js` — block counting

**Input:** §4.2 (data flow), §4.4 (storage schema)  
**Output:** `chrome.declarativeNetRequest.onRuleMatchedDebug` listener

**Behavior:**
1. Listen for rule match events
2. Increment the appropriate counter in `storage.session.tabCounters[tabId]`
3. Map rule IDs to categories (easylist rules → `blocked`, headers rules → depends)
4. Update badge text via `chrome.action.setBadgeText`
5. Badge text = total blocked count, truncated to "99+" if over 99

**Acceptance:**
- Badge updates within 100ms of a blocked request
- Counter persists within a session but resets on browser restart (storage.session)
- Category breakdown (blocked, fingerprints, upgraded) correctly tracked

---

### TASK-007: Implement `src/background.js` — farbling injection

**Input:** §4.3, §7.3  
**Output:** `chrome.webNavigation.onCommitted` listener + `injectFarbling` function

**Behavior:**
1. On `webNavigation.onCommitted`: get hostname from frameUrl
2. Check if fingerprinting protection is enabled for this hostname
3. If enabled: retrieve or generate a session seed for this hostname
4. Call `chrome.scripting.executeScript` with `world: "MAIN"`, `func: installFarbling`, `args: [seed]`

**Acceptance:**
- Farbling script is injected before page JS runs (verified with test page)
- Seed is the same for the same origin within a session
- Seed changes between browser sessions
- Farbling is NOT injected when fingerprinting is disabled for the site
- Farbling is NOT injected on `chrome://` pages (error would occur)

---

### TASK-008: Implement `src/farbling.js`

**Input:** §7.3, §5.3 (F-03)  
**Output:** `installFarbling(seed)` function that wraps all fingerprinting APIs

**Implement wrappers for all APIs listed in F-03.**

**Acceptance:**
- All listed APIs are wrapped
- `canvas.toDataURL()` returns a different value after noise injection
- `Function.prototype.toString` returns native code string for all wrapped functions
- No `console.error` or exceptions thrown during normal page operation
- Unit test in `tests/unit/farbling.test.js` verifies noise is applied and toString works

---

### TASK-009: Implement `src/cosmetic.js`

**Input:** §7.4, pre-built list of CSS selectors (see TASK-013)  
**Output:** Content script that injects cosmetic filters

**Acceptance:**
- Style element injected at `document_start`
- `MutationObserver` watches for new nodes that match selectors
- No visible impact on non-ad content

---

### TASK-010: Implement `src/bounce.js`

**Input:** §7.5, F-06  
**Output:** Content script that detects bounce tracking and messages background

**Acceptance:**
- Correctly extracts destination from `l.facebook.com`, `t.co`, `ow.ly` URLs
- Sends `BOUNCE_DETECTED` message with `destination` string
- Does nothing on non-bounce pages

---

### TASK-011: Implement `popup/popup.js` and `popup/popup.html`

**Input:** §9 (full popup spec)  
**Output:** Functional popup that shows correct state and allows toggles

**Implementation steps:**
1. On popup open: send `GET_TAB_STATE` to background
2. Render State A, B, or C based on response
3. Attach event listeners to all toggles
4. Each toggle change: send `SET_SITE_SETTING` to background
5. Shields master toggle: also triggers a visual reload prompt

**Acceptance:**
- Popup renders correctly for a normal site, a chrome:// page, and a site with shields off
- All toggles send correct messages
- Block count displayed accurately
- Popup does not throw any errors in DevTools console
- Works in light and dark mode (uses CSS variables tied to `prefers-color-scheme`)

---

### TASK-012: Implement `options/options.js` and `options/options.html`

**Input:** §10 (options page spec)  
**Output:** Functional options page

**Acceptance:**
- All four sections render correctly
- Global settings changes are persisted to storage
- Filter list table shows correct metadata
- Allowlist/blocklist textarea saves correctly

---

### TASK-013: Implement `tools/convert-filters.js`

**Input:** ABP-format filter list text file  
**Output:** Valid DNR JSON rule array

**Algorithm:**
1. Read the `.txt` file line by line
2. Skip comments (lines starting with `!`) and blank lines
3. Skip cosmetic filter rules (lines containing `##` or `#@#`) — these go to cosmetic.js
4. For each network rule:
   - Parse domain anchors (`||example.com^`)
   - Parse options (`$third-party`, `$script`, `$image`, etc.)
   - Map to DNR `condition` and `action`
   - Assign an incrementing `id`
5. Deduplicate by urlFilter
6. Output JSON array

**Resource type mapping:**

| ABP option | DNR resourceType |
|---|---|
| `$script` | `"script"` |
| `$image` | `"image"` |
| `$stylesheet` | `"stylesheet"` |
| `$xmlhttprequest` | `"xmlhttprequest"` |
| `$font` | `"font"` |
| (none) | all types |

**Acceptance:**
- Converts EasyList (30k+ rules) without crashing
- Output passes `chrome.declarativeNetRequest` rule validation
- Test: known tracker domain in EasyPrivacy → appears in output JSON

---

### TASK-014: Write DNR rule files — `rules/params.json`

**Input:** List of tracking parameters from §5.5 (F-05)  
**Output:** `rules/params.json` — valid DNR rules that strip tracking parameters via redirect

**Example rule:**
```json
{
  "id": 1,
  "priority": 1,
  "action": {
    "type": "redirect",
    "redirect": {
      "regexSubstitution": "\\1"
    }
  },
  "condition": {
    "regexFilter": "^(https?://[^?#]*)[?&]utm_source=[^&]*(.*)",
    "resourceTypes": ["main_frame", "sub_frame"]
  }
}
```

**Acceptance:**
- All parameters from §5.5 are stripped
- Non-tracking parameters preserved
- Tested against sample URLs in `tests/unit/params.test.js`

---

### TASK-015: Write `rules/headers.json`

**Input:** §5.4 (cookie blocking), fingerprint header reduction  
**Output:** `rules/headers.json` with header modification rules

**Rules to include:**
1. Remove `Cookie` from third-party requests
2. Remove `Set-Cookie` from third-party responses
3. Remove `Referer` from cross-origin requests (when referrer reduction is on)

**Acceptance:**
- Rules are valid DNR `modifyHeaders` actions
- Correctly use `domainType: "thirdParty"` condition

---

### TASK-016: Create shield icons (SVG → PNG)

**Input:** Shield shape specification  
**Output:** PNG icon files at 16×16, 32×32, 48×48, 128×128 for three states (on, off, partial)

**Design specification:**
- Shield shape: classic heater shield silhouette
- ON state: `#2F8C4A` (green) fill, white `S` letterform or checkmark inside
- OFF state: `#888888` (gray) fill, white `×` inside
- PARTIAL state: `#E07B00` (amber) fill, white `⚠` inside
- Clean, minimal, legible at 16×16

**Output files:**
```
icons/shield-on-16.png
icons/shield-on-32.png
icons/shield-on-48.png
icons/shield-on-128.png
icons/shield-off-16.png ... (same pattern)
icons/shield-partial-16.png ... (same pattern)
```

---

### TASK-017: Integration testing with Playwright

**Input:** All source files from previous tasks  
**Output:** `tests/integration/blocking.test.js` — automated tests using Playwright

**Test scenarios:**
1. Load a page that includes a known tracker pixel → verify the request was blocked (check network log)
2. Disable shields for a site → verify tracker loads
3. Navigate to `http://` version of an HTTPS site → verify redirect to HTTPS
4. Load a page with canvas fingerprinting code → verify the fingerprint output differs between two sessions (requires two browser contexts)

**Acceptance:**
- All tests pass with `npx playwright test`
- Tests run in headless Chrome with the extension loaded

---

### TASK-018: Write `README.md`

**Input:** This specification, completed source files  
**Output:** User-facing `README.md`

**Sections:**
1. What is openShield
2. Features
3. Installation (from Chrome Web Store and from source)
4. Usage guide (popup walkthrough)
5. Privacy policy (no data collected, no telemetry)
6. Building from source (`npm run build`)
7. Contributing
8. License

---

## 12. Coding Standards

### 12.1 JavaScript

- **ES2022** — use modern syntax; no transpilation needed for Chromium MV3
- **ESM modules** — use `import`/`export` everywhere except content scripts (which cannot use ESM when injected via manifest)
- **No bundler** — the extension is loaded unpacked; keep files as-is. Only the build tool (`tools/build.js`) processes files for production
- **Strict mode** — `"use strict"` in all non-module files; ESM is strict by default
- **No third-party runtime dependencies** — only browser extension APIs
- **`async/await`** — prefer over Promise chains
- **JSDoc comments** on all exported functions

**Naming conventions:**
```javascript
// Constants: SCREAMING_SNAKE_CASE
const MAX_RULES = 30000;

// Functions: camelCase, verb-first
async function getTabState(tabId) {}
function parseHostname(url) {}

// Classes: PascalCase (avoid classes where plain functions suffice)
class FilterParser {}

// Event listeners: handle + Event noun
function handleTabRemoved(tabId, removeInfo) {}
function handleMessage(message, sender, sendResponse) {}
```

### 12.2 HTML / CSS

- No inline styles, no inline scripts (MV3 CSP forbids inline scripts)
- CSS variables for all colors and spacing
- All event listeners in `.js` files only
- Use semantic HTML5 elements

### 12.3 JSON (DNR rules)

- Each rule must have: `id` (integer, unique across the file), `priority` (1 unless overriding), `action`, `condition`
- Sort rules by `id` ascending
- Include a comment file (`rules/RULES_README.md`) explaining the structure

### 12.4 Git Commit Convention

```
feat(farbling): add AudioContext noise injection
fix(popup): correct badge count display for large numbers
docs(spec): update TASK-007 acceptance criteria
chore(build): update EasyList conversion script
test(farbling): add toString native code test
```

---

## 13. Testing Protocol

### 13.1 Unit Tests

Run with: `node --test tests/unit/**/*.test.js` (Node.js built-in test runner)

| File | What it tests |
|---|---|
| `tests/unit/utils.test.js` | All `utils.js` functions |
| `tests/unit/farbling.test.js` | Noise injection, toString, seed consistency |
| `tests/unit/params.test.js` | URL param stripping rules vs sample URLs |
| `tests/unit/config.test.js` | Default settings structure completeness |

### 13.2 Manual Test Checklist

Before any release, manually verify on Chrome (stable), Edge, and Vivaldi:

**Blocking:**
- [ ] Visit `https://www.theguardian.com` — Google Analytics requests blocked
- [ ] Visit `https://reddit.com` — Reddit tracking blocked
- [ ] Badge count updates on each page load

**HTTPS Upgrade:**
- [ ] Navigate to `http://example.com` → observe upgrade to `https://example.com`

**Fingerprinting:**
- [ ] Visit `https://coveryourtracks.eff.org` → check Canvas fingerprint protection
- [ ] Open DevTools console, run `document.createElement('canvas').toDataURL()` twice in two separate windows → outputs should differ

**Per-site toggle:**
- [ ] Turn shields off for `guardian.com` → tracking no longer blocked
- [ ] Visit `nytimes.com` → tracking still blocked

**Cookie blocking:**
- [ ] Visit a site with Facebook like buttons → third-party Facebook cookies not set

**Popup UI:**
- [ ] Correct domain shown
- [ ] Correct counts shown
- [ ] All toggles respond immediately

**Options page:**
- [ ] All settings save and reload correctly after browser restart

### 13.3 Performance Benchmarks

Run on a clean Chrome profile. The extension should not materially degrade:
- Page load time: < 5% increase on a standard news site (Lighthouse Performance score)
- Memory: < 20MB additional memory for the extension process

---

## 14. Release Checklist

### 14.1 Pre-Release

- [ ] All TASK-001 through TASK-018 completed
- [ ] All unit tests pass
- [ ] Manual test checklist passed on Chrome stable, Edge, Vivaldi
- [ ] `manifest.json` version bumped
- [ ] `README.md` reflects current feature state
- [ ] No `console.log` statements in production code (only `console.error` and `console.warn`)
- [ ] `tools/` directory excluded from the zip package
- [ ] `tests/` directory excluded from the zip package

### 14.2 Packaging

```bash
# From the openShield root directory:
node tools/build.js

# This will:
# 1. Run filter list conversion
# 2. Validate manifest.json
# 3. Validate all DNR rule files
# 4. Create openShield-vX.Y.Z.zip excluding tools/ and tests/
```

### 14.3 Chrome Web Store Submission

- Privacy disclosure: list all permissions and justify each
- No remote code execution (verify no `eval`, no `Function()` constructor, no remote script loading)
- Single-purpose declaration: privacy protection
- All icons provided at required sizes

---

## 15. Glossary

| Term | Definition |
|---|---|
| **ABP** | Adblock Plus — a filter list syntax used by EasyList, EasyPrivacy, and uBlock Origin |
| **DNR** | Declarative Net Request — the MV3 API for network-level request blocking/modification |
| **Farbling** | Brave's term for adding deterministic noise to fingerprinting APIs. Derived from "far" + "garbling" |
| **Fingerprinting** | Technique where websites combine multiple browser/device properties to uniquely identify a user |
| **HSTS** | HTTP Strict Transport Security — a mechanism where sites signal they should always be accessed over HTTPS |
| **MAIN world** | The JavaScript execution context of the web page itself. Content scripts run here when `world: "MAIN"` |
| **ISOLATED world** | A sandboxed JS context for content scripts that can access the DOM but not the page's JS variables |
| **MV3** | Manifest Version 3 — the current Chrome Extension API version, required as of June 2025 |
| **Session seed** | A random value generated once per browser session per origin, used to derive deterministic noise |
| **Ruleset** | A named collection of DNR rules that can be enabled or disabled as a unit |
| **Tracker** | A third-party resource (script, pixel, iframe) that tracks user behavior across sites |
| **UTM params** | Urchin Tracking Module parameters — URL query parameters used for campaign tracking (e.g., `utm_source`) |
| **Bounce tracking** | A technique where a redirect through an intermediate tracking domain happens before the user reaches their destination |
| **Cosmetic filters** | CSS rules that hide HTML elements (e.g., ad containers) without blocking the network request |
| **eTLD+1** | Effective Top-Level Domain plus one label. For `sub.example.co.uk`, the eTLD+1 is `example.co.uk` |
| **Dynamic rules** | DNR rules set at runtime via `updateDynamicRules()`, limited to 5,000; used for per-site exceptions |
| **Static rules** | DNR rules declared in `manifest.json` and loaded from JSON files; limited to 30,000 total |

---

*openShield Development Specification — maintained by openShield contributors — MIT License*
