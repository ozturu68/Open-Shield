---
last_updated: 2026-04-26
status: active
next_review: 2026-07-26
---

# Architecture — openShield Mimari Kararlari ve Desenleri

## Bu Dosyanin Amaci

Bu dosya, openShield'in **mimari kararlarini, sistem tasarimini, kullanilan desenleri ve onemli yapısal secimleri** icerir. AI yeni bir ozellik gelistirirken mevcut deseni anlamasi icin bu dosyaya basvurur.

---

## 1. Sistem Mimarisi Genel Bakis

### 1.1. Mimari Turu

**Secilen:** **Service Worker merkezli, event-driven MV3 uzantisi**

**Neden:** MV3 tarayici uzantilari service worker tabanlidir. Persistent background page yoktur. Tum state ya storage'da ya da event-driven message passing ile yonetilir. Uzanti; service worker (beyin), content script'ler (sayfa ici), ve UI (popup/options) olarak uc ana bilesene ayrilir.

### 1.2. Yuksek Seviye Mimari Diyagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    Chrome Tarayici                               │
│                                                                  │
│  ┌─────────────────┐     ┌─────────────────┐                    │
│  │   Popup UI       │     │  Options Page   │                    │
│  │  (popup.html/js) │     │ (options.html/js)│                   │
│  └───────┬─────────┘     └───────┬─────────┘                    │
│          │ sendMessage           │ sendMessage                   │
│          ▼                       ▼                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Service Worker (background.js)                │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │ Settings │ │  DNR     │ │  Inject  │ │  Bounce      │  │  │
│  │  │ Manager  │ │  Rules   │ │  Scripts │ │  Detection   │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │ Counters │ │ Auto     │ │  Icon    │ │  Message     │  │  │
│  │  │ & Log    │ │ Shred    │ │  Manager │ │  Router      │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │  │
│  └──────┬──────────────────────────────────────┬─────────────┘  │
│         │ DNR onRuleMatched                    │ executeScript   │
│         ▼                                      ▼                 │
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │  DNR Engine      │    │  Web Page (MAIN world)            │  │
│  │  (Chrome built-in)│   │  ├─ installFarbling()             │  │
│  │                   │    │  ├─ installWebRTCBlock()         │  │
│  │  Static Rules:    │    │  └─ installBeaconBlock()         │  │
│  │  5 rulesets       │    └──────────────────────────────────┘  │
│  │                   │                                          │
│  │  Dynamic Rules:   │    ┌──────────────────────────────────┐  │
│  │  toggle + allow   │    │  Web Page (ISOLATED world)        │  │
│  └──────────────────┘    │  ├─ cosmetic.js (CSS hiding)      │  │
│                          │  └─ bounce.js  (bounce detect)    │  │
│                          └──────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Chrome Storage                               │  │
│  │  ┌─────────────────────┐  ┌─────────────────────┐        │  │
│  │  │ storage.local       │  │ storage.session     │        │  │
│  │  │ (persistent state)  │  │ (per-session state) │        │  │
│  │  └─────────────────────┘  └─────────────────────┘        │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Bilesenler Arasi Iletisim

### 2.1. Message Passing

```
Popup/Options ──(chrome.runtime.sendMessage)──▶ Service Worker
Service Worker ──(sendResponse)──────────────▶ Popup/Options
Service Worker ──(chrome.scripting.executeScript)──▶ MAIN world
Content Script ──(chrome.runtime.sendMessage)──▶ Service Worker
```

### 2.2. Mesaj Tipleri (MSG constants from config.js)

| Mesaj Tipi | Yon | Amac | Payload |
|-----------|-----|------|---------|
| GET_STATE | UI → SW | Site durumu ve istatistikleri al | `{hostname}` |
| SET_SITE | UI → SW | Per-site ayar degistir | `{hostname, key, value}` |
| SET_GLOBAL | UI → SW | Global ayar degistir | `{key, value}` |
| GET_LOG | UI → SW | Block log detaylarini al | `{tabId}` |
| BOUNCE | Content → SW | Bounce domain bildir | `{url, target, hostname}` |

### 2.3. Input Validasyonu

Tum mesaj handler'lari input validasyonu yapar:
- `isValidHostname(h)` — hostname format kontrolu
- `isValidDestination(dest)` — URL format ve izinli domain kontrolu
- `ALLOWED_SITE_KEYS` / `ALLOWED_GLOBAL_KEYS` — izinli ayar anahtarlari set'i

---

## 3. DNR (declarativeNetRequest) Mimarisi

### 3.1. Rule ID Stratejisi

```
Statik:    1...N per ruleset (manifest declared, incrementing)
Dinamik:   100000 + (hostname_hash % 50000) — per-site toggle
           150000 + i — allowlist entries
```

### 3.2. Kural Oncelikleri

Tum kurallar `priority: 1` ile calisir. Dinamik allow kurallari (`action: "allow"`) statik block kurallarindan daha yuksek oncelige sahiptir (Chrome'un built-in davranisi, allow > block).

### 3.3. Ruleset Enable/Disable

- Statik ruleset'ler `chrome.declarativeNetRequest.updateEnabledRulesets` ile enable/disable edilir
- Dinamik kurallar `chrome.declarativeNetRequest.updateDynamicRules` ile eklenir/cikarilir
- Per-site toggle: site hash'ine karsilik gelen ID'ye sahip `allow` dinamik kurali ekler/cikarir

---

## 4. Service Worker Yasam Dongusu Yonetimi

### 4.1. State Yonetimi Stratejisi

Service worker her an sonlandirilabileceginden, state yonetimi su sekildedir:

| State | Konum | Fallback |
|-------|-------|----------|
| Global settings | storage.local | - (kalici) |
| Per-site settings | storage.local | - (kalici) |
| Tab counters | storage.session | Map `tabCounters` in-memory cache |
| Block log | storage.session | Map `logCache` in-memory cache |
| Tab origins | storage.session | Map `_tabOrigins` in-memory cache |
| PRNG seeds | storage.session | - (oturum bazli) |

**Onemli:** In-memory Map'ler (`logCache`, `tabCounters`) her zaman storage'a yazilir ve okunurken storage'dan fallback yapilir.

### 4.2. Event Listener Kaydi

Tum event listener'lar service worker baslangicinda (ilk satirlarda) kaydedilir. Bunlar:
- `chrome.runtime.onInstalled` / `onStartup`
- `chrome.declarativeNetRequest.onRuleMatchedDebug`
- `chrome.tabs.onRemoved` / `onUpdated` / `onActivated`
- `chrome.webNavigation.onCommitted` / `onBeforeNavigate`
- `chrome.runtime.onMessage`

---

## 5. Kod Organizasyonu ve Desenler

### 5.1. Dosya Sorumluluklari

| Dosya | Sorumluluk | Bagimliliklar |
|-------|-----------|--------------|
| `config.js` | Sabitler, storage key'leri, mesaj tipleri | Yok |
| `utils.js` | Saf yardimci fonksiyonlar | Yok |
| `background.js` | Service worker mantigi | config.js, utils.js |
| `cosmetic.js` | ISOLATED dunya CSS gizleme | Yok (IIFE) |
| `bounce.js` | ISOLATED dunya bounce tespiti | Yok (IIFE) |
| `popup.js` | Popup UI mantigi | chrome.runtime (message) |
| `options.js` | Options sayfasi mantigi | chrome.runtime, chrome.declarativeNetRequest |

### 5.2. Kullanilan Desenler

- **Observer Pattern:** DNR `onRuleMatchedDebug` + popup state guncelleme
- **Strategy Pattern:** `effective()` ile global/site ayarlarinin katmanli cozumu
- **Message Router:** Tek `chrome.runtime.onMessage` handler'i ile merkezi yonlendirme
- **Guard Clauses:** `isValidHostname`, `isValidDestination` input validasyonu
- **Immutability:** Deep merge (`merge()`) ile settings guncellemede orijinal objenin korunmasi

---

## 6. Guvenlik Mimarisi

### 6.1. Temel Prensipler

- **Least privilege:** Sadece gerekli MV3 permission'lari istenir
- **Input validation:** Tum mesaj handler'lari ve URL islemleri validasyonlu
- **Prototype pollution korumasi:** `merge()` fonksiyonu `__proto__`, `constructor`, `prototype` anahtarlarini reddeder
- **Self-contained injection:** MAIN-world script'leri modul scope'una referans icermez (serialization guvenligi)
- **Sifir telemetri:** Disariya veri gonderen kod yok
- **Sifir harici istek:** Calisma aninda harici URL'e istek yok (DNR haric)

### 6.2. Permission Gerekceleri

| Permission | Gerekce |
|-----------|---------|
| `declarativeNetRequest` | Ag filtreleme (temel islev) |
| `declarativeNetRequestFeedback` | `onRuleMatchedDebug` icin |
| `storage` | Ayarlar ve oturum verisi |
| `tabs` | Sekme durumu, icon yonetimi |
| `scripting` | MAIN-world script enjeksiyonu |
| `webNavigation` | Navigasyon takibi, bounce tespiti |
| `browsingData` | Auto Shred (site verisi temizleme) |
| `<all_urls>` host | DNR'in tum sitelerde calismasi |

---

## 7. Architecture Decision Records (ADR)

### ADR-001: Sifir Bagimlilik

| Alan | Deger |
|------|-------|
| **Tarih** | Proje baslangici |
| **Durum** | Kabul edildi |
| **Karar** | Tum runtime kodu sadece Web Extension API'leri kullanir. npm paketi yok. |
| **Gerekce** | Guvenlik (supply chain saldirisi riski), Chrome Web Store incelemesi, minimal bundle boyutu |
| **Sonuclar** | Kodda utility fonksiyonlari kendimiz yaziyoruz. Test framework'u olarak node:test kullaniyoruz. Build araclari gelistirme zamani icin. |

### ADR-002: ES Modules + IIFE Hibriti

| Alan | Deger |
|------|-------|
| **Tarih** | Proje baslangici |
| **Durum** | Kabul edildi |
| **Karar** | Service worker (`background.js`) ESM, content script'ler IIFE. UI script'leri (popup, options) inline oldugu icin IIFE. |
| **Gerekce** | MV3 service worker `type: "module"` destekler. Ancak manifest ile deklare edilen content script'ler ESM import yapamaz. Popup ve options sayfalari inline script kullandigi icin `<script type="module">` gerektirir. |
| **Sonuclar** | Kod tekrari (utils.js fonksiyonlari popup ve options'ta duplike). Bunun bilincinde olarak, shared kod `config.js` ESM olarak sadece import edebilen yerlerde kullanilir. |

### ADR-003: DNR (webRequest Degil)

| Alan | Deger |
|------|-------|
| **Tarih** | Proje baslangici |
| **Durum** | Kabul edildi (MV3 tarafindan zorunlu) |
| **Karar** | Tum ag filtreleme `declarativeNetRequest` ile, dinamik sayfa ici modifikasyonlar content script + executeScript ile. |
| **Gerekce** | MV3'te `webRequest` blocking API'si kaldirilmistir. Tek secenek DNR'dir. |
| **Sonuclar** | Dinamik filtreleme yapilamaz (ornegin regex bazli URL filtreleme runtime'da degistirilemez). Statik kurallar extension guncellemesi gerektirir. Dinamik kurallar sinirli (5000). |

---

**Son Guncelleme:** 2026-04-26
**Sonraki Review:** Her ceyrek (3 ay)
**Sahibi:** openShield Gelistirici
