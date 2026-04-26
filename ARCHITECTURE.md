# openShield Architecture

## High-Level Overview

openShield is a Chromium Manifest V3 browser extension implementing privacy protections similar to Brave Shields. It operates entirely client-side with zero external dependencies and no telemetry.

```
┌──────────────────────────────────────────────────────┐
│                     User Interface                     │
│   popup/ (toolbar)          options/ (settings page)   │
│   ─ toggle per-site         ─ global defaults          │
│   ─ view stats              ─ filter list management   │
│   ─ access settings         ─ allowlist/blocklist      │
└──────────┬──────────────────────┬──────────────────────┘
           │ chrome.runtime       │ chrome.runtime
           │ sendMessage          │ sendMessage
           ▼                      ▼
┌──────────────────────────────────────────────────────┐
│               Service Worker (background.js)           │
│                                                        │
│  ┌─ Settings Engine ──┐  ┌─ DNR Manager ────────────┐ │
│  │ merge(global,site) │  │ static rulesets (5)      │ │
│  │ write-through cache│  │ dynamic rules (toggle)   │ │
│  │ per-site override  │  │ allowlist rules          │ │
│  └────────────────────┘  │ auto-update lists (4)    │ │
│                          │ rule quota monitor       │ │
│  ┌─ Injector ─────────┐  └─────────────────────────┘ │
│  │ farbling (MAIN)    │                               │
│  │ WebRTC (MAIN)      │  ┌─ Lifecycle ─────────────┐ │
│  │ beacon (MAIN)      │  │ auto-shred (browsingData)│ │
│  │ conditional gating │  │ tab origin tracking     │ │
│  └────────────────────┘  │ badge + icon state       │ │
│                          └─────────────────────────┘ │
│  ┌─ Alarms ───────────┐  ┌─ Message Router ────────┐ │
│  │ filter refresh/4d  │  │ GET_STATE, SET_SITE     │ │
│  │ ABP→DNR conversion │  │ SET_GLOBAL, GET_LOG     │ │
│  │ diff-based updates │  │ BOUNCE redirect         │ │
│  └────────────────────┘  └─────────────────────────┘ │
└──────────┬──────────────────────┬──────────────────────┘
           │ executeScript         │ webNavigation
           ▼                       ▼
┌────────────────────┐  ┌─────────────────────────────┐
│   MAIN World        │  │   ISOLATED World Content     │
│   (script injection)│  │   Scripts (document_start)   │
│                     │  │                               │
│  Canvas/WebGL/Audio │  │  cosmetic.js — CSS hiding    │
│  RTCPeerConnection  │  │  bounce.js — bounce detect   │
│  navigator.sendBeacon│ │  MutationObserver            │
└────────────────────┘  └─────────────────────────────┘
```

## Component Boundaries

### Service Worker (`src/background.js`)

The central orchestrator. ESM module imported by Chrome at extension load.

**Capabilities:**
- `chrome.storage.local` / `chrome.storage.session` for persistent state
- `chrome.declarativeNetRequest` for network filtering (static + dynamic rules)
- `chrome.scripting.executeScript` for MAIN-world code injection
- `chrome.webNavigation` for navigation lifecycle events
- `chrome.alarms` for periodic filter list updates
- `chrome.runtime.onMessage` for UI communication

**Constraints:**
- Can be terminated by browser at any time (~30s idle)
- No DOM access (not a page context)
- In-memory state (Map, Set) is ephemeral — must persist to storage

### DNR Rules (`rules/*.json`)

Network-layer filtering via declarative rule engine.

| Ruleset | Purpose | Rules | Type |
|---------|---------|-------|------|
| `easylist` | Ad blocking | 60 | Static |
| `easyprivacy` | Tracker blocking | 20 | Static |
| `params` | URL parameter stripping | 2 | Static |
| `https_upgrade` | HTTP → HTTPS | 10 | Static |
| `headers` | Cookie/Referer/DNT headers | 6 | Static |
| `ublock-filters` | uBlock Origin ads | ~4000 | Dynamic (auto) |
| `ublock-privacy` | uBlock Origin privacy | ~4000 | Dynamic (auto) |
| `adguard-base` | AdGuard Base | ~4000 | Dynamic (auto) |
| `adguard-tracking` | AdGuard Tracking | ~4000 | Dynamic (auto) |

**Dynamic Rule ID Ranges (non-overlapping):**
```
 10,000 – 19,999  ublock-filters
 20,000 – 29,999  ublock-privacy
 30,000 – 39,999  adguard-base
 40,000 – 49,999  adguard-tracking
100,000 – 149,999  Per-site shields toggle (hash-based)
150,000 – 199,999  Allowlist (options page)
```

### Content Scripts — ISOLATED World

Manifest-declared scripts running in every frame at `document_start`.

- **`cosmetic.js`**: Injects CSS `display: none !important` via `<style>` element. Uses `MutationObserver` with `requestIdleCallback` batching for dynamic content.
- **`bounce.js`**: Detects navigation through known bounce/tracking redirect domains (l.facebook.com, t.co, bit.ly, etc.), extracts destination from query params.

### MAIN-world Injections

Self-contained functions executed via `chrome.scripting.executeScript` with `world: "MAIN"`. These must NOT reference any module-scope variables (serialization constraint).

- **`installFarbling(seed, factor)`**: Wraps Canvas 2D, WebGL, Audio APIs to inject deterministic noise. Uses xorshift PRNG seeded per site+session. Noise magnitude scaled by `fpLevel` (low/medium/high).
- **`installWebRTCBlock()`**: Wraps `RTCPeerConnection` to filter out local IP addresses from ICE candidates.
- **`installBeaconBlock()`**: Blocks `navigator.sendBeacon`, `fetch({ keepalive })`, and XHR to `/ping` endpoints.

**Injection gating:**
- All three are only injected when `cfg.fp === true` (fingerprinting protection enabled)
- None injected when `cfg.shields === false` (site-level shields off)

## Message Passing Protocol

All cross-component communication uses `chrome.runtime.sendMessage` with validated message types:

```
Popup ──GET_STATE(tabId)────▶ SW ──reply(h, cfg, counts)
Popup ──SET_SITE(h, k, v)──▶ SW ──reply(ok)
Options ──SET_GLOBAL(k, v)─▶ SW ──reply(ok)
Options ──GET_LOG(tabId)───▶ SW ──reply(log[])
bounce.js ──BOUNCE(dest)───▶ SW ──redirect tab
```

**Forbidden paths (by architecture rules):**
- Popup/Options → direct DNR API (must go through SW)
- Popup/Options → direct Storage API
- Content Script → Popup/Options

## Storage Architecture

```
chrome.storage.local (persistent, ~10MB quota)
├── globalSettings  ── merged with DEFAULT_SETTINGS
├── siteSettings    ── { hostname: { shields, ads, fp, ... } }
├── filterMeta      ── { listId: [ruleIds], listId_updated: timestamp }
├── customAllowlist ── [domain, ...]
└── customBlocklist ── [domain, ...]

chrome.storage.session (per-session, ~1MB quota)
├── tabCounters  ── { tabId: { blocked, upgraded, bounces } }
├── sessionSeeds ── { hostname: "hexSeed" }
├── blockLog     ── { tabId: [{ url, ruleId, rs, t }] }
└── tabOrigins   ── { tabId: "https://origin" }
```

**Write-through cache pattern:** `logCache` (Map) is always written to alongside `storage.session`, and read from storage.session as fallback when the Map is cold.

## Filter Update Lifecycle

```
Extension Install/Startup
  └─▶ runFilterUpdates()
        └─▶ For each of 4 auto-update sources:
              ├─ fetch(list URL)
              ├─ parse ABP → DNR rules
              ├─ diff with existing dynamic rules
              │    ├─ compute keys (urlFilter || regexFilter)
              │    ├─ mark old IDs for removal
              │    └─ add only rules with new keys
              └─ updateDynamicRules({ removeRuleIds, addRules })

chrome.alarms (every 4 days)
  └─▶ runFilterUpdates()
```

The diff-based update minimizes `updateDynamicRules` calls — only changed rules are added/removed, not the entire list.

## Security Architecture

| Layer | Mechanism |
|-------|-----------|
| CSP | `script-src 'self'; object-src 'self'` (manifest) |
| Input validation | `isValidHostname()`, `isValidDestination()` on all messages |
| Prototype pollution | `merge()` rejects `__proto__`, `constructor`, `prototype` keys |
| URL safety | `fetch-lists.js` validates source URLs against allowlist of 5 hosts |
| DNR safety | Rule ID ranges prevent collisions; hash-based ID generation |
| No eval | ESLint `no-eval` enforced; `Function()` constructor never used |
| No telemetry | Zero external fetch calls at runtime (except filter list refresh) |

## Key Technical Decisions (ADRs)

### ADR-001: Zero Runtime Dependencies
All code uses only Web Extension APIs. No npm packages in the extension runtime. Tools (`tools/`) use Node.js built-ins only (except optional `archiver` for ZIP creation).

### ADR-002: ESM + IIFE Hybrid
Service worker uses ESM (`import`/`export`). Content scripts (manifest-declared) use IIFE because Chrome does not support ESM content scripts. UI scripts (popup/options) use IIFE for consistency.

### ADR-003: DNR over webRequest
`declarativeNetRequest` is the only network filtering API in MV3. `webRequest` blocking is not available. All ad/tracker blocking goes through DNR rules.

### ADR-004: Diff-based Dynamic Rule Updates
When refreshing filter lists, we compute the difference between existing and new rules by comparing rule keys (`urlFilter || regexFilter`). Only added/removed rules are sent to `updateDynamicRules`, avoiding unnecessary API calls when only a few rules change.

### ADR-005: Per-List Dynamic ID Ranges
Each auto-updated filter list gets its own 10,000-ID range to prevent collisions and allow independent management. The static ranges for shields toggle (100K-150K) and allowlist (150K-200K) remain separate.
