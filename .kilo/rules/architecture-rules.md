---
last_updated: 2026-04-26
version: 1.0.0
enforce: true
review_cycle: quarterly
---

# Architecture Rules — openShield Mimari Kurallar

## Bu Dosyanin Amaci

Bu dosya, openShield'in **mimari yapisina uyulmasini zorunlu kilan kurallari** tanimlar. MV3 tarayici uzantisi mimarisinde service worker, content script, DNR ve storage bilesenleri arasindaki sinirlar ve kurallar.

---

## 1. Bilesen Sinirlari ve Sorumluluklar

| Bilesen | Sorumluluk | Yasak |
|---------|-----------|-------|
| **Service Worker** (`background.js`) | State yonetimi, DNR, message routing, script injection, bounce detection | DOM manipülasyonu (sayfa baglami yok) |
| **Content Script ISOLATED** (`cosmetic.js`, `bounce.js`) | Sayfa ici CSS manipülasyonu, bounce domain tespiti | Sayfa JS'ine erisim, chrome.storage (dogrudan) |
| **MAIN-world Injection** (inline functions) | Canvas/WebGL/Audio farbling, WebRTC IP filtreleme, beacon engelleme | Storage, modul referansi |
| **Popup** (`popup/`) | Site bazli durum gosterme, toggle | DNR kural yonetimi (dogrudan) |
| **Options** (`options/`) | Global ayarlar, filter listeler, allowlist/blocklist | Service worker state manipülasyonu (dogrudan) |
| **DNR Rules** (`rules/*.json`) | Statik ag filtreleme | Dinamik davranis (build-time sabit) |

---

## 2. Iletisim Kurallari

### 2.1. Message Passing (Tek Izinli Yontem)

```
Popup/Options ──sendMessage──▶ Service Worker ──sendResponse──▶ Popup/Options
Content Script ──sendMessage──▶ Service Worker
Service Worker ──executeScript──▶ MAIN world
```

**YASAK:**
- Popup/Options → dogrudan DNR API (background.js uzerinden yapilmali)
- Popup/Options → dogrudan Storage API (background.js uzerinden yapilmali)
- Content Script → Popup/Options (sadece background.js ile iletisim)

### 2.2. Mesaj Handler Kurallari

Her `chrome.runtime.onMessage` handler'i:
- Input validasyonu yapmali (`isValidHostname`, `isValidDestination`, allowed key sets)
- Async response icin `return true` yapmali
- Hata durumunda anlamli hata mesaji dondurmeli

---

## 3. State Yonetim Kurallari

### 3.1. State Yasam Dongusu

| State | Lokasyon | Yasam Suresi | Kullanim |
|-------|----------|-------------|----------|
| Global settings | `storage.local` | Kalici | `DEFAULT_SETTINGS` merge |
| Per-site settings | `storage.local` | Kalici | `SITES[key]` |
| Tab counters | `storage.session` | Sekme yasami | `COUNTERS[tabId]` |
| PRNG seeds | `storage.session` | Oturum | `SEEDS[seed]` |
| Block log | `storage.session` | Oturum (max 80) | `LOG[tabId]` |
| Tab origins | `storage.session` | Sekme yasami | `ORIGINS[tabId]` |

### 3.2. Write-Through Cache (Zorunlu)

In-memory Map'ler (`logCache`, `tabCounters`) her zaman:
- Yazma: Hem Map'e hem `storage.session`'a yaz
- Okuma: Once Map'e bak, yoksa `storage.session`'dan oku

---

## 4. DNR (declarativeNetRequest) Kurallari

### 4.1. Rule ID Araliklari (Dokunulmaz)

```
1 ... N                     Statik kurallar (ruleset bazinda)
100000 ... 149999           Dinamik: per-site shields toggle
150000 ... 199999           Dinamik: allowlist
200000 ... 249999           Dinamik: JS blocking
300000 ... 309999           Dinamik: cohort auto-block
```

**YASAK:** Bu araliklarin disinda ID kullanmak. Collision olursa her iki kural da calismaz.

### 4.2. Kural Onceligi

- Tum statik kurallar `priority: 1`
- Dinamik allow kurallari `priority: 1` (allow > block Chrome tarafindan)
- Dinamik block kurallari `priority: 1`

### 4.3. Statik vs Dinamik

- **Statik:** Sadece extension guncellemesi ile degisir. `manifest.json` `rule_resources`'a kayitli.
- **Dinamik:** `updateDynamicRules` ile runtime'da degisir. Max 5000 kural.

---

## 5. Modul ve Bagimlilik Kurallari

### 5.1. Izinli Bagimliliklar

```
background.js ──import──▶ config.js
background.js ──import──▶ utils.js
config.js      bağimsiz
utils.js       bağimsiz
cosmetic.js    bağimsiz (IIFE, import yok)
bounce.js      bağimsiz (IIFE, import yok)
popup.js       bağimsiz (IIFE, chrome.runtime API)
options.js     bağimsiz (IIFE, chrome.runtime + chrome.declarativeNetRequest API)
```

### 5.2. Yasak Bagimliliklar

- UI script'leri (popup, options) → ESM import (IIFE olduklari icin yapamazlar)
- Content script'ler → ESM import (manifest ile deklare edildikleri icin)
- MAIN-world functions → modul scope referansi (serialize edilemez)
- Herhangi bir dosya → npm paketi (sifir bagimlilik)

---

## 6. Permission Kurallari

### 6.1. Yeni Permission Ekleme

Yeni bir Chrome API permission'i eklenmeden once:
1. **Gerekli mi?** Sifir bagimlilik prensibiyle uyusuyor mu?
2. **CWS etkisi:** Chrome Web Store incelemesini zorlastirir mi?
3. **Least privilege:** Daha az yetkiyle yapilabilir mi?

`browsingData` permission'i ozellikle dikkatli — CWS'de manuel inceleme tetikleyebilir.

### 6.2. Permission Degisikligi Sureci

1. `manifest.json`'a ekle
2. `AGENTS.md` ve `memory-bank/architecture.md`'i guncelle
3. Kullanim gerekcesini `project-brief.md` riskler tablosuna ekle
4. `node tools/build.js` ile valide et
5. Extension yeniden yukle (chrome://extensions)

---

## 7. Anti-Pattern'ler

| Anti-Pattern | Neden Yanlis | Dogru Yaklasim |
|-------------|-------------|---------------|
| Service worker'da global degisken | Teardown'da kaybolur | `storage.session` write-through |
| Content script'te `chrome.storage` | Gereksiz, message passing yeterli | `sendMessage` ile background'a sor |
| Popup'ta dogrudan DNR API | Sorumluluk ihlali | `SET_SITE` mesaji gonder |
| MAIN-world'de modul import | Serialization calismaz | Self-contained inline function |
| DNR ID araligi cakismasi | Kural calismaz | Hash-based + aralik korumasi |
| `webRequest` API kullanimi | MV3'te yok | DNR kullan |
| Background'da DOM API | Service worker'da DOM yok | Content script kullan |

---

**Son Guncelleme:** 2026-04-26
**Sonraki Review:** Her ceyrek
**Sahibi:** openShield Gelistirici
