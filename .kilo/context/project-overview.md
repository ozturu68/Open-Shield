---
last_updated: 2026-04-26
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
├── src/                       # Kaynak kod
│   ├── background.js          # Service worker (state, DNR, farbling injection)
│   ├── cosmetic.js            # ISOLATED world CSS ad gizleme (document_start)
│   ├── bounce.js              # ISOLATED world bounce tespiti
│   ├── config.js              # Paylasilan sabitler (ES module)
│   └── utils.js               # Saf yardimci fonksiyonlar (ES module)
│
├── popup/                     # Popup UI (toolbar icon tiklamasi)
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
│
├── options/                   # Options sayfasi (uzanti sag tik → Options)
│   ├── options.html
│   ├── options.js
│   └── options.css
│
├── rules/                     # Statik DNR kural dosyalari (JSON)
│   ├── easylist.json          # Reklam domain engelleme (~60 kural)
│   ├── easyprivacy.json       # Tracker/analytics engelleme (~20 kural)
│   ├── params.json            # URL tracking parametre temizleme (2 kural)
│   ├── https_upgrade.json     # HTTP → HTTPS yonlendirme (~10 kural)
│   ├── headers.json           # Header modifikasyonu (6 kural)
│   └── bounce_domains.json    # Bounce domain veri dosyasi
│
├── icons/                     # PNG ikonlar (16/32/48/128 — on/off/partial)
│
├── tools/                     # Build ve gelistirme araclari (dev-only)
│   ├── build.js               # Manifest + DNR validasyonu + zip olusturma
│   ├── convert-filters.js     # ABP filtre → DNR kural donusturucu
│   └── fetch-lists.js         # Filter liste indirme scripti
│
├── tests/
│   └── unit/                  # Unit testler (node:test)
│       ├── config.test.js     # DEFAULT_SETTINGS, KEY, MSG testleri
│       ├── utils.test.js      # hostname, merge, normHost, seed testleri
│       ├── farbling.test.js   # Farbling PRNG, noise fonksiyonu testleri
│       └── params.test.js     # URL parametre yakalama testleri
│
└── .kilo/                     # AI entegrasyon context'i (BU DIZIN!)
    ├── AGENTS.md              # AI ajan davranis yonetmeligi
    ├── memory-bank/           # Proje hafizasi
    ├── rules/                 # Kodlama/mimari/guvenlik/test kurallari
    ├── context/               # Context dosyalari (bu dosya dahil)
    ├── workflows/             # Gorev workflow'lari
    ├── prompts/               # Prompt sablonlari
    └── skills/                # AI yetenekleri
```

---

## 2. Modul Organizasyonu

### 2.1. openShield Modulleri ve Sorumluluklari

| Dosya | Modul | Sorumluluk | Dunya | Modul Sistemi |
|-------|-------|-----------|-------|--------------|
| `src/background.js` | Service Worker | State yonetimi, DNR dinamik kurallar, script injection, message routing, bounce detection | Service Worker | ESM |
| `src/config.js` | Sabitler | DEFAULT_SETTINGS, KEY, SESSION, MSG, BOUNCE_DOMAINS, TRACKING_PARAMS | — | ESM |
| `src/utils.js` | Yardimcilar | hostname, normHost, seed, merge, isBrowser, isValidHostname, isValidDestination | — | ESM |
| `src/cosmetic.js` | Kozmetik | ISOLATED world CSS reklam gizleme, MutationObserver | ISOLATED | IIFE |
| `src/bounce.js` | Bounce Tespiti | ISOLATED world bounce link tespiti | ISOLATED | IIFE |
| `popup/popup.js` | Popup UI | Site bazli toggle + istatistik gosterme | Popup | IIFE (inline) |
| `options/options.js` | Options UI | Global ayarlar, filter listeler, allowlist/blocklist | Options | IIFE (inline) |
| `manifest.json` | Manifest | MV3 yapilandirmasi, izinler, ruleset tanimlari | — | JSON |

### 2.2. Modul Durumlari

| Modul | Durum | Aciklama |
|-------|-------|----------|
| Service Worker | **Aktif** | Temel beyin: state, DNR, injection, message routing |
| DNR Static Rules | **Aktif** | 5 ruleset: easylist, easyprivacy, params, https_upgrade, headers |
| DNR Dynamic Rules | **Aktif** | Per-site toggle (100K-149K ID) + allowlist (150K-199K ID) |
| Farbling Injection | **Aktif** | Canvas, WebGL, Audio, font parmak ize korumasi |
| WebRTC Block | **Aktif** | RTCPeerConnection IP sizintisi engelleme |
| Beacon Block | **Aktif** | sendBeacon/fetch keepalive engelleme |
| Cosmetic Filtering | **Aktif** | CSS reklam gizleme (MutationObserver) |
| Bounce Detection | **Aktif** | Bounce domain tespiti ve yonlendirme atlama |
| Auto Shred | **Aktif** | Sekme kapaninca site verisi temizleme |
| Popup UI | **Aktif** | Toolbar popup: site durumu, toggle, sayaçlar |
| Options UI | **Aktif** | Global ayarlar, izin listeleri |
| Build/Test | **Aktif** | node tools/build.js, node --test |

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
│  ┌──────────┐  chrome.runtime.sendMessage  │  ┌────────┐ │  │
│  │ Options  │ ───────────────────────────▶ │  │ State  │ │  │
│  │  UI      │ ◀─────────────────────────── │  │ DNR    │ │  │
│  └──────────┘       sendResponse           │  │ Inject │ │  │
│                                             │  │ Router │ │  │
│                                             │  └────────┘ │  │
│                                             └──┬───┬──────┘  │
│                                                │   │         │
│         ┌──────────────────────────────────────┘   │         │
│         │ chrome.scripting.executeScript           │         │
│         │ (MAIN world)                             │ DNR     │
│         ▼                                          │ Engine  │
│  ┌──────────────────┐                              │         │
│  │ Web Sayfasi      │                              │         │
│  │ (MAIN world)     │                              ▼         │
│  │ ├ installFarbling│  ◄──── DNR onRuleMatched ── statik    │
│  │ ├ installWebRTC  │        (sayaç + log)         dinamik  │
│  │ └ installBeacon  │                                        │
│  │                   │                              │         │
│  │ (ISOLATED world)  │                              │         │
│  │ ├ cosmetic.js     │                              │         │
│  │ └ bounce.js       │                              │         │
│  └──────────────────┘                              │         │
│                                                     │         │
│  ┌──────────────────────────────────────────────────┘         │
│  │  chrome.storage                                            │
│  │  ├ storage.local  (kalici: GLOBAL, SITES, META, ALLOW)    │
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
- `src/config.js` ve `src/utils.js` ESM olarak sadece `src/background.js`'ten import edilir
- `popup/` ve `options/` script'leri IIFE oldugu icin ESM import YAPAMAZ — gerekli sabitler duplike edilir
- Content script'ler manifest-deklare oldugu icin IIFE'dir — ESM import YAPAMAZ
- MAIN-world injection fonksiyonlari `chrome.scripting.executeScript` ile serialize edildigi icin IMPORT ICEREMEZ

---

## 5. Onemli Dosya ve Giris Noktalari

| Dosya | Amac | Kim Kullanir |
|-------|------|-------------|
| `manifest.json` | MV3 yapilandirma, izinler, ruleset | Chrome, build arac |
| `src/background.js` | Service worker: tum is mantigi | Chrome (sw) |
| `src/config.js` | Paylasilan sabitler | background.js, popup.js (duplike), options.js (duplike) |
| `src/utils.js` | Saf yardimci fonksiyonlar | background.js |
| `tools/build.js` | Manifest + DNR validasyonu + zip | Gelistirici (node) |
| `tests/unit/*.test.js` | Unit testler | node:test |

---

## 6. AI Context Referansi

AI projeyi anlarken su sirayla okumali:
1. `AGENTS.md` (kok dizin) — Proje ozeti ve MV3 kisitlar
2. `.kilo/memory-bank/project-brief.md` — Amac ve kapsam
3. `.kilo/memory-bank/tech-stack.md` — API'ler ve teknolojiler
4. `.kilo/memory-bank/architecture.md` — Mimari kararlar
5. Bu dosya — Proje yapisi
6. `manifest.json` — Izinler ve yapilandirma
7. `src/background.js` — Ana service worker kodu

---

**Son Guncelleme:** 2026-04-26
**Sonraki Review:** Her ay
**Sahibi:** openShield Gelistirici
