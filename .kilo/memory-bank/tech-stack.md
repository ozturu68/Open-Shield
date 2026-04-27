---
last_updated: 2026-04-27
status: current
next_audit: 2026-07-27
---

# Tech Stack — openShield Teknoloji Yigini

## Bu Dosyanin Amaci

Bu dosya, openShield projesinde kullanilan **tum teknolojileri, API'leri, versiyonlari ve tercih nedenlerini** icerir. AI yeni bir ozellik gelistirirken hangi API'yi kullanacagini buradan ogrenir.

---

## 1. Calisma Zamani Teknolojileri (Runtime)

openShield **sifir runtime bagimlilik** prensibiyle gelistirilmistir. Tum kod sadece tarayici API'lerini kullanir.

| Teknoloji / API | Versiyon | Kullanim Alani |
|----------------|---------|---------------|
| JavaScript | ES2022 | Tum kaynak kod |
| Web Extension API | Manifest V3 | Tum tarayici etkilesimi |
| chrome.declarativeNetRequest | MV3 | Ag filtreleme, header modifikasyonu, URL yonlendirme |
| chrome.storage (local + session) | MV3 | Kalici ayarlar + oturum verisi |
| chrome.scripting.executeScript | MV3 | MAIN-world script enjeksiyonu (tek installAll cagrisi) |
| chrome.webNavigation | MV3 | Navigasyon takibi, bounce detection, injection trigger |
| chrome.tabs | MV3 | Sekme durumu, icon yonetimi, origin tracking |
| chrome.runtime | MV3 | Message passing, service worker yasam dongusu |
| chrome.action | MV3 | Toolbar icon, badge text, popup |
| chrome.browsingData | MV3 | Auto shred (site verisi temizleme) |
| chrome.alarms | MV3 | Periyodik filter guncelleme + cohort temizleme |
| DOM API (MutationObserver) | - | Kozmetik filtreleme, link protection, click-to-load |
| Canvas/WebGL/Audio API | - | Farbling (wrap edilen API'ler) |
| WebRTC (RTCPeerConnection) | - | IP sizintisi engelleme (wrap edilen) |

---

## 2. Gelistirme ve Build Teknolojileri

| Arac | Versiyon | Kullanim Alani | Notlar |
|------|---------|---------------|--------|
| Node.js | >=18 | Build araclari ve test calistirma | Sadece gelistirme asamasinda |
| node:test | built-in | Unit test runner | Harici test framework yok. 78 test, 8 dosya |
| archiver (npm) | latest | Build: zip olusturma | Sadece `tools/build.js`'te, optional |
| Git | >=2.x | Versiyon kontrolu | GitHub: ozturu68/Open-Shield |

---

## 3. Veri Saklama

| Teknoloji | Kullanim | Anahtar | Veri | Kalicilik |
|-----------|---------|---------|------|----------|
| chrome.storage.local | Kalici ayarlar | `GLOBAL`, `SITES`, `META`, `ALLOW`, `BLOCK`, `COHORT`, `LEARNING`, `JS_BLOCKED` | Ayarlar, site override'lari, izin listeleri, cohort DB, ogrenme verisi | Surum guncellemeleri arasi kalici |
| chrome.storage.session | Oturum verisi | `COUNTERS`, `SEEDS`, `LOG`, `ORIGINS`, `LEARNING_SESSION` | Tab bazli sayaclar, PRNG seed'leri, block log (max 80), tab origin'leri | Tarayici kapaninca/sekme kapaninca silinir |

---

## 4. DNR Kurallari (declarativeNetRequest)

### 4.1. Statik Ruleset'ler

| Ruleset ID | Dosya | Amac | Kural Sayisi | Oncelik |
|-----------|-------|------|-------------|---------|
| easylist | rules/easylist.json | Reklam domain engelleme | 125 | 1 |
| easyprivacy | rules/easyprivacy.json | Tracker/analytics engelleme | 20 | 1 |
| params | rules/params.json | URL tracking param temizleme | 3 | 1 |
| https_upgrade | rules/https_upgrade.json | HTTP → HTTPS yonlendirme | 10 | 1 |
| headers | rules/headers.json | Header modifikasyonu (cookie, referer, DNT, GPC, CH) | 25 | 1 |
| 3p-block | rules/3p-block.json | 3rd-party script/frame block (disabled by default) | 2 | 1 |

**Toplam statik kural:** 185 (30.000 limite kadar genisletilebilir)

### 4.2. Dinamik Kurallar

| ID Araligi | Amac | Yoneten | Not |
|-----------|------|---------|-----|
| 10,000–59,999 | Dinamik filter kurallari (runtime fetch+convert) | `filters.js` | MAX_PER_LIST=1200 ile sinirli |
| 100,000–149,999 | Per-site shields toggle (allow kurali) | `dnr.js` `setShields()` | Hash tabanli |
| 150,000–199,999 | Allowlist (kullanici tarafindan eklenen) | `index.js` `SET_ALLOWLIST` | Sequential ID |
| 200,000–249,999 | JS blocking (selective) | `dnr.js` `setJSBlocked()` | Hash tabanli |
| 300,000–309,999 | Cohort auto-block | `dnr.js` `cohortId()` | `requestDomains` format |

---

## 5. Dosya Yapisi ve Teknoloji Kullanimi

| Dosya | Teknoloji | Modul Sistemi | Dunya (World) |
|-------|-----------|--------------|---------------|
| manifest.json | JSON | - | - |
| src/core/config.js | ES2022 | ESM | Service Worker |
| src/core/utils.js | ES2022 | ESM | Service Worker |
| src/background/index.js | ES2022, chrome.* API | ESM | Service Worker |
| src/background/settings.js | ES2022, chrome.storage | ESM | Service Worker |
| src/background/dnr.js | ES2022, chrome.declarativeNetRequest | ESM | Service Worker |
| src/background/injections.js | ES2022 | ESM (self-contained serialization) | MAIN-world (executeScript) |
| src/background/tab-lifecycle.js | ES2022, chrome.tabs, chrome.browsingData | ESM | Service Worker |
| src/background/filters.js | ES2022, fetch, chrome.declarativeNetRequest | ESM | Service Worker |
| src/background/learning.js | ES2022, chrome.storage | ESM | Service Worker |
| src/background/cohort.js | ES2022, chrome.storage, chrome.declarativeNetRequest | ESM | Service Worker |
| src/content/cosmetic.js | ES2022, DOM API, MutationObserver | IIFE | ISOLATED |
| src/content/bounce.js | ES2022, DOM API | IIFE | ISOLATED |
| src/content/link-protection.js | ES2022, DOM API, MutationObserver | IIFE | ISOLATED |
| src/content/click-to-load.js | ES2022, DOM API, MutationObserver | IIFE | ISOLATED |
| src/content/security.js | ES2022, DOM API | IIFE | ISOLATED |
| src/polyfills/browser-polyfill.js | ES2022 | ESM | Service Worker (Firefox compat) |
| ui/popup/popup.js | ES2022, chrome.runtime | IIFE (inline script) | Popup |
| ui/popup/popup.html | HTML5 | - | Popup |
| ui/popup/popup.css | CSS3 (custom properties, dark/light) | - | Popup |
| ui/options/options.js | ES2022, chrome.runtime, chrome.storage | IIFE (inline script) | Options Page |
| ui/options/options.html | HTML5 | - | Options Page |
| ui/options/options.css | CSS3 (custom properties, dark/light) | - | Options Page |
| rules/*.json | JSON (DNR kural format) | - | Build-time |

---

## 6. Yasakli / Tercih Edilmeyen Teknolojiler

| Teknoloji | Neden Kullanilmiyor |
|-----------|-------------------|
| npm paketleri (runtime) | Sifir bagimlilik prensibi |
| TypeScript | Sadelik, build adimi gereksiz |
| React/Vue/Angular | UI minimal (popup + options), framework overkill |
| webRequest API | MV3'te yok, DNR kullaniliyor |
| eval() / new Function() | Guvenlik riski |
| jQuery | Gereksiz, DOM API yeterli |
| localStorage | chrome.storage daha guvenli ve MV3 uyumlu |

---

## 7. Teknoloji Karar Kayitlari

| Tarih | Karar | Gerekce |
|-------|-------|---------|
| Proje baslangici | Zero-dependency | Guvenlik (supply chain), boyut, CWS incelemesi |
| Proje baslangici | Manifest V3 | CWS V2'yi kabul etmiyor |
| Proje baslangici | DNR (webRequest degil) | MV3'te webRequest blocking yok |
| Proje baslangici | ES modulleri (background) + IIFE (content/UI) | MV3 service worker ESM destekler, content script'ler desteklemez |
| Proje baslangici | node:test (Jest/Mocha degil) | Sifir bagimlilik, Node.js built-in |
| 2026-04-27 | Moduler dizin yapisi (core/background/content/ui) | Kod buyudukce flat yapi yonetilemez hale geldi |
| 2026-04-27 | Consolidated injection (installAll) | 5 IPC cagrisi → 1: performans ve sira garantisi |
| 2026-04-27 | Cohort DNR `requestDomains` format | Dinamik kurallarda `\|\|domain^` urlFilter calismiyor |

---

**Son Guncelleme:** 2026-04-27
**Sonraki Audit:** Her buyuk surum oncesi
**Sahibi:** openShield Gelistirici
