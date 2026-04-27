---
last_updated: 2026-04-27
status: active
---

# Project Overview — openShield Proje Genel Bakis

## Bu Dosyanin Amaci

Bu dosya, openShield projesinin **yapisal organizasyonunu, onemli dizinlerini, dosya konvansiyonlarini ve modul haritasini** icerir. AI projeyi anlamak icin bu dosyaya basvurur.

**Ne Zaman Guncellenir:** Yeni modul eklendiginde, dizin yapisi degistiginde.

---

## 1. Proje Dizin Yapisi

```
openShield/
│
├── manifest.json              # MV3 manifest (izinler, DNR ruleset, content script, icon)
│
├── src/
│   ├── core/                  # Paylasilan moduller (ESM)
│   │   ├── config.js          # Sabitler: DEFAULT_SETTINGS, KEY, MSG, TRACKING_PARAMS, DNR limits
│   │   └── utils.js           # Saf fonksiyonlar: hostname, merge, seed, rand, validators
│   │
│   ├── background/            # Service worker (8 modul — ESM)
│   │   ├── index.js           # Ana orkestrator: message router, injection trigger, DNR listener
│   │   ├── settings.js        # Write-through cache: settings, counters, block log
│   │   ├── dnr.js             # Dinamik DNR kural yonetimi: toggle, allowlist, JS block, cohort
│   │   ├── injections.js      # Self-contained MAIN-world injection fonksiyonlari (installAll)
│   │   ├── tab-lifecycle.js   # Tab yasam dongusu: auto-shred, icon state, origin tracking
│   │   ├── filters.js         # ABP→DNR donusturme + otomatik filter guncelleme (alarms)
│   │   ├── learning.js        # Heuristic tracker sinyal isleme + cohort trigger
│   │   └── cohort.js          # Privacy Badger tarzi cross-site tracker tespiti + auto-block
│   │
│   ├── content/               # ISOLATED world content script'ler (IIFE, manifest-deklare)
│   │   ├── cosmetic.js        # CSS reklam gizleme (36 selector + 9 procedural operator)
│   │   ├── bounce.js          # Bounce domain tespiti (9 domain, redirect)
│   │   ├── link-protection.js # Link tracking parametre temizleme (100+ param)
│   │   ├── click-to-load.js   # Sosyal medya embed korumasi (18 platform)
│   │   └── security.js        # XSS reflekte + clickjacking tespiti
│   │
│   └── polyfills/
│       └── browser-polyfill.js # Firefox uyumluluk shim (browser vs chrome)
│
├── ui/                        # Kullanici arayuzu
│   ├── popup/                 # Toolbar popup (300px, dark/light tema)
│   │   ├── popup.html         # Markup: shield, toggle, stats, protection badges, actions
│   │   ├── popup.js           # Logic: GET_STATE, SET_SITE, animated counters, badge state
│   │   └── popup.css          # Styles: dark/light theme, toggle, badges, animations
│   │
│   └── options/               # Tam sayfa ayarlar (520px max-width, dark/light tema)
│       ├── options.html        # Markup: hero, stats, 15 ayar kontrolu, cohort, about
│       ├── options.js          # Logic: SET_GLOBAL, stats polling, cohort insights
│       └── options.css         # Styles: dark/light theme, toggle, select, animations
│
├── rules/                     # Statik DNR kural dosyalari (JSON)
│   ├── easylist.json          # Reklam domain engelleme (125 kural)
│   ├── easyprivacy.json       # Tracker/analytics engelleme (20 kural)
│   ├── params.json            # URL tracking parametre temizleme (3 kural, 150+ param)
│   ├── https_upgrade.json     # HTTP → HTTPS yonlendirme (10 kural)
│   ├── headers.json           # Header modifikasyonu (25 kural: cookie, referer, CH, DNT, GPC)
│   ├── 3p-block.json          # 3rd-party script/frame block (2 kural, default disabled)
│   └── bounce_domains.json    # Bounce domain veri dosyasi (9 domain)
│
├── icons/                     # PNG ikonlar (16/32/48/128 — on/off/partial)
│
├── tools/                     # Build ve gelistirme araclari (dev-only, Node.js)
│   ├── build.js               # Master build: manifest + DNR validasyonu, test run, zip
│   ├── convert-filters.js     # ABP filtre → DNR kural donusturucu
│   ├── fetch-lists.js         # Filter liste indirme (ALLOWED_HOSTS, redirect, retry)
│   ├── build-hsts.js          # HSTS preload → DNR upgradeScheme kurallari
│   └── extract-cosmetic.js    # ABP kozmetik → procedural selector extractor
│
├── tests/
│   └── unit/                  # Unit testler (node:test, 78 test, 8 dosya)
│       ├── config.test.js     # DEFAULT_SETTINGS, KEY, MSG, sabit testleri (15 test)
│       ├── utils.test.js      # hostname, merge, hashForId, validator testleri (10 test)
│       ├── farbling.test.js   # PRNG determinism, range testleri (5 test)
│       ├── farbling-config.test.js  # FP_NOISE_FACTORS, fpLevel testleri (5 test)
│       ├── params.test.js     # DNR params regex, URL strip testleri (6 test)
│       ├── background-pure.test.js  # abpLineToDNR, ruleKey, validator testleri (24 test)
│       ├── convert-rules.test.js    # Bagimsiz ABP→DNR donusum testleri (8 test)
│       └── bounce-validate.test.js  # Bagimsiz validator testleri (5 test)
│
└── .kilo/                     # AI entegrasyon context'i
    ├── AGENTS.md              # AI ajan davranis yonetmeligi
    ├── kilo.jsonc             # Kilo CLI yapilandirmasi
    ├── memory-bank/           # Proje hafizasi (5 dosya)
    ├── rules/                 # Kodlama/mimari/guvenlik/test kurallari (4 dosya)
    ├── context/               # Context dosyalari (3 dosya)
    ├── agents/                # Ozel AI ajan tanimlari (5 ajan)
    ├── skills/                # AI yetenekleri (4 skill)
    ├── workflows/             # Gorev workflow'lari (4 workflow)
    └── prompts/               # Prompt sablonlari (4 prompt)
```

---

## 2. Modul Organizasyonu

### 2.1. openShield Modulleri ve Sorumluluklari

| Dosya | Modul | Sorumluluk | Dunya | Modul Sistemi |
|-------|-------|-----------|-------|--------------|
| `src/core/config.js` | Sabitler | DEFAULT_SETTINGS, KEY, SESSION, MSG, TRACKING_PARAMS, DNR limits | — | ESM |
| `src/core/utils.js` | Yardimcilar | hostname, normHost, seed, merge, rand, hashForId, validators | — | ESM |
| `src/background/index.js` | Orkestrator | Message router, injection trigger, DNR listener, bounce detection | Service Worker | ESM |
| `src/background/settings.js` | Settings Engine | Write-through cache, effective(), counters(), inc(), pushLog() | Service Worker | ESM |
| `src/background/dnr.js` | DNR Manager | Dinamik kural ekleme/cikarma, setShields, setJSBlocked, cohortId | Service Worker | ESM |
| `src/background/injections.js` | Enjeksiyonlar | installAll (GPC+Farbling+WebRTC+Beacon+Learning) — self-contained | MAIN-world | ESM (serialize) |
| `src/background/tab-lifecycle.js` | Tab Yonetimi | autoShred, setIcon, setupTabListeners | Service Worker | ESM |
| `src/background/filters.js` | Filter Sistemi | abpLineToDNR, refreshFilterList, runFilterUpdates, setupFilterAlarm | Service Worker | ESM |
| `src/background/learning.js` | Ogrenme | handleLearningSignals, score tracking, cohort trigger | Service Worker | ESM |
| `src/background/cohort.js` | Cohort DB | recordThirdParty, autoBlockCohort, getCohortStats, cleanupCohortDB | Service Worker | ESM |
| `src/content/cosmetic.js` | Kozmetik | CSS reklam gizleme, procedural selectors, MutationObserver | ISOLATED | IIFE |
| `src/content/bounce.js` | Bounce | Bounce domain tespiti ve redirect | ISOLATED | IIFE |
| `src/content/link-protection.js` | Link Korumasi | href scrub, click-time strip, MutationObserver | ISOLATED | IIFE |
| `src/content/click-to-load.js` | Embed Korumasi | Sosyal medya embed placeholder, click-to-activate | ISOLATED | IIFE |
| `src/content/security.js` | Guvenlik | XSS reflekte tespiti, clickjacking overlay tespiti | ISOLATED | IIFE |
| `ui/popup/popup.js` | Popup UI | Site bazli toggle, 3 istatistik, 6 protection badge | Popup | IIFE (inline) |
| `ui/options/options.js` | Options UI | 15 global ayar kontrolu, cohort insights, stats polling | Options | IIFE (inline) |
| `manifest.json` | Manifest | MV3 yapilandirma, 8 permission, 6 ruleset, 5 content script | — | JSON |

### 2.2. Modul Durumlari

| Modul | Durum | Aciklama |
|-------|-------|----------|
| Service Worker (index.js) | **Aktif** | Ana beyin: 8 background modulunu orkestre eder |
| DNR Static Rules | **Aktif** | 6 ruleset: easylist, easyprivacy, params, https_upgrade, headers, 3p-block |
| DNR Dynamic Rules | **Aktif** | 5 ID araligi: filter, toggle, allowlist, JS block, cohort auto-block |
| Farbling Injection | **Aktif** | Canvas, WebGL, Audio, font — 4 seviye (low/medium/high/strict) |
| WebRTC Block | **Aktif** | RTCPeerConnection: private IPv4/IPv6 IP filtreleme |
| Beacon Block | **Aktif** | sendBeacon, keepalive fetch, XHR /ping blokaji |
| Cosmetic Filtering | **Aktif** | 36 CSS selector + 9 procedural operator, debounced MObserver |
| Bounce Detection | **Aktif** | 9 bounce domain, onBeforeNavigate + content script dual tespit |
| Auto Shred | **Aktif** | Sekme kapaninca cookies, localStorage, indexedDB, cacheStorage, SW temizleme |
| Cohort Tracking | **Aktif** | Cross-site tracker tespiti, 3 site esigi, auto-block requestDomains |
| Learning Mode | **Aktif** | Heuristic sinyal scoring, MAIN-world observer, otomatik cohort trigger |
| Filter Updates | **Aktif** | chrome.alarms ile gunluk, 4 source, MAX_PER_LIST=1200 |
| Popup UI | **Aktif** | Toggle, 3 stat, 6 badge, animated counters, reload/settings actions |
| Options UI | **Aktif** | 15 ayar kontrolu, cohort tracker listesi, global stats polling |
| Build/Test | **Aktif** | node tools/build.js, node --test (78/78 pass) |

---

## 3. Uzanti Mimarisi Akis Diyagrami

```
┌──────────────────────────────────────────────────────────────┐
│                    Chrome Tarayici                           │
│                                                              │
│  ┌──────────┐  chrome.runtime.sendMessage  ┌─────────────┐  │
│  │  Popup   │ ───────────────────────────▶ │  Service    │  │
│  │  UI      │ ◀─────────────────────────── │  Worker     │  │
│  └──────────┘       sendResponse           │  (ESM)      │  │
│                                             │             │  │
│  ┌──────────┐  chrome.runtime.sendMessage  │  8 modul:   │  │
│  │ Options  │ ───────────────────────────▶ │  index      │  │
│  │  UI      │ ◀─────────────────────────── │  settings   │  │
│  └──────────┘       sendResponse           │  dnr        │  │
│                                             │  injections │  │
│                                             │  lifecycle  │  │
│                                             │  filters    │  │
│                                             │  learning   │  │
│                                             │  cohort     │  │
│                                             └──┬───┬──────┘  │
│                                                │   │         │
│         ┌──────────────────────────────────────┘   │         │
│         │ chrome.scripting.executeScript           │         │
│         │ installAll() — tek cagri                 │ DNR     │
│         ▼                                          │ Engine  │
│  ┌──────────────────┐                              │         │
│  │ Web Sayfasi      │                              │         │
│  │ (MAIN world)     │                              ▼         │
│  │ ├ installAll()   │  ◄── DNR onRuleMatched ── 6 statik   │
│  │ │ GPC             │      (counter + log)       ruleset   │
│  │ │ Farbling        │      + badge update        + dinamik │
│  │ │ WebRTC Block    │                                        │
│  │ │ Beacon Block    │                              │         │
│  │ └ Learning Obs.   │                              │         │
│  │                   │                              │         │
│  │ (ISOLATED world)  │                              │         │
│  │ ├ cosmetic.js     │                              │         │
│  │ ├ bounce.js       │                              │         │
│  │ ├ link-protect.js │                              │         │
│  │ ├ click-to-load.js│                              │         │
│  │ └ security.js     │                              │         │
│  └──────────────────┘                              │         │
│                                                     │         │
│  ┌──────────────────────────────────────────────────┘         │
│  │  chrome.storage                                            │
│  │  ├ storage.local  (kalici: GLOBAL, SITES, COHORT, etc)    │
│  │  └ storage.session(oturum: COUNTERS, SEEDS, LOG, ORIGINS) │
│  └────────────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Dosya Konvansiyonlari

### 4.1. Dosya Isimlendirme
- Tum dosyalar: `kebab-case.js`, `kebab-case.html`, `kebab-case.css`, `kebab-case.json`
- Icon dosyalari: `shield-on-16.png`, `shield-off-32.png`, `shield-partial-48.png`
- Test dosyalari: `[modul].test.js` (ornegin: `config.test.js`)

### 4.2. Dosya Organizasyonu Sirasi
```
1. Dosya baslik JSDoc
2. Import'lar (ESM dosyalari icin, alfabetik)
3. Sabitler (SCREAMING_SNAKE_CASE)
4. Top-level fonksiyon declaration'lari
5. Event listener kayitlari
6. Export'lar (ESM dosyalari icin)
```

### 4.3. Import/Export Kurallari
- `src/core/config.js` ve `src/core/utils.js` ESM olarak tum `src/background/` modullerinden import edilir
- `ui/popup/` ve `ui/options/` script'leri IIFE oldugu icin ESM import YAPAMAZ — gerekli sabitler duplike edilir (MSG, norm, isBrowser)
- Content script'ler manifest-deklare oldugu icin IIFE'dir — ESM import YAPAMAZ
- MAIN-world injection fonksiyonlari `chrome.scripting.executeScript` ile serialize edildigi icin IMPORT ICEREMEZ — `args` parametresi ile veri alir

---

## 5. Onemli Dosya ve Giris Noktalari

| Dosya | Amac | Kim Kullanir |
|-------|------|-------------|
| `manifest.json` | MV3 yapilandirma, izinler, ruleset, content script tanimlari | Chrome, build arac |
| `src/background/index.js` | Service worker ana giris noktasi: tum background modullerini import eder | Chrome (sw) |
| `src/core/config.js` | Tum sabitlerin single source of truth'u | Tum background modulleri |
| `src/core/utils.js` | Saf yardimci fonksiyonlar | Tum background modulleri |
| `src/background/injections.js` | Self-contained MAIN-world fonksiyonlari | index.js (executeScript ile) |
| `tools/build.js` | Manifest + DNR validasyonu + test + zip | Gelistirici (node) |
| `tests/unit/*.test.js` | Unit testler | node:test |

---

## 6. AI Context Referansi

AI projeyi anlarken su sirayla okumali:
1. `AGENTS.md` (kok dizin) — Proje ozeti ve MV3 kisitlar
2. `.kilo/memory-bank/project-brief.md` — Amac, kapsam, roadmap
3. `.kilo/memory-bank/tech-stack.md` — API'ler, teknolojiler, dosya yapisi
4. `.kilo/memory-bank/architecture.md` — Mimari kararlar, ADR'ler, DNR stratejisi
5. `.kilo/memory-bank/context.md` — Aktif gorevler, bilinen sorunlar
6. Bu dosya — Detayli proje yapisi ve modul haritasi
7. `manifest.json` — Izinler ve yapilandirma
8. `src/core/config.js` — Sabitler ve default'lar
9. `src/background/index.js` — Ana service worker kodu

---

**Son Guncelleme:** 2026-04-27
**Sonraki Review:** Her ay
**Sahibi:** openShield Gelistirici
