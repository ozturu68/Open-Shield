---
last_updated: 2026-04-26
status: current
next_audit: 2026-07-26
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
| chrome.scripting.executeScript | MV3 | MAIN-world script enjeksiyonu |
| chrome.webNavigation | MV3 | Navigasyon takibi, bounce detection |
| chrome.tabs | MV3 | Sekme durumu, icon yonetimi |
| chrome.runtime | MV3 | Message passing, service worker yasam dongusu |
| chrome.action | MV3 | Toolbar icon ve popup |
| chrome.browsingData | MV3 | Auto shred (site verisi temizleme) |
| DOM API (MutationObserver) | - | Kozmetik filtreleme |
| Canvas/WebGL/Audio API | - | Farbling (wrap edilen API'ler) |
| WebRTC (RTCPeerConnection) | - | IP sizintisi engelleme (wrap edilen) |

---

## 2. Gelistirme ve Build Teknolojileri

| Arac | Versiyon | Kullanim Alani | Notlar |
|------|---------|---------------|--------|
| Node.js | >=18 | Build araclari ve test calistirma | Sadece gelistirme asamasinda |
| node:test | built-in | Unit test runner | Harici test framework yok |
| archiver (npm) | latest | Build: zip olusturma | Sadece `tools/build.js`'te, optional |
| Git | >=2.x | Versiyon kontrolu | - |

---

## 3. Veri Saklama

| Teknoloji | Kullanim | Anahtar | Veri | Kalicilik |
|-----------|---------|---------|------|----------|
| chrome.storage.local | Kalici ayarlar | `GLOBAL`, `SITES`, `META`, `ALLOW`, `BLOCK` | Ayarlar, site override'lari, izin listeleri | Surum guncellemeleri arasi kalici |
| chrome.storage.session | Oturum verisi | `COUNTERS`, `SEEDS`, `LOG`, `ORIGINS` | Tab bazli sayaçlar, PRNG seed'leri, block log, tab origin'leri | Sekme kapaninca silinir |

---

## 4. DNR Kurallari (declarativeNetRequest)

### 4.1. Statik Ruleset'ler

| Ruleset ID | Dosya | Amac | Kural Sayisi (yaklasik) | Oncelik |
|-----------|-------|------|----------------------|---------|
| easylist | rules/easylist.json | Reklam domain engelleme | ~60 | 1 |
| easyprivacy | rules/easyprivacy.json | Tracker/analytics engelleme | ~20 | 1 |
| params | rules/params.json | URL tracking param temizleme | 2 | 1 |
| https_upgrade | rules/https_upgrade.json | HTTP → HTTPS yonlendirme | ~10 | 1 |
| headers | rules/headers.json | Header modifikasyonu (cookie, referer, DNT, GPC) | 6 | 1 |

**Toplam statik kural:** ~100 (30.000 limite kadar genisletilebilir)

### 4.2. Dinamik Kurallar

| ID Araligi | Amac | Yoneten |
|-----------|------|---------|
| 100000–149999 | Per-site shields toggle (allow kurali) | background.js `setShields()` |
| 150000–199999 | Allowlist (kullanici tarafindan eklenen) | options.js `save-lists` |

---

## 5. Dosya Yapisi ve Teknoloji Kullanimi

| Dosya | Teknoloji | Modul Sistemi | Dunya (World) |
|-------|-----------|--------------|---------------|
| manifest.json | JSON | - | - |
| src/background.js | ES2022, chrome.* API | ESM (`type: "module"`) | Service Worker |
| src/config.js | ES2022 | ESM | Service Worker / Popup |
| src/utils.js | ES2022 | ESM | Service Worker |
| src/cosmetic.js | ES2022, DOM API | IIFE | ISOLATED |
| src/bounce.js | ES2022 | IIFE | ISOLATED |
| popup/popup.js | ES2022 | IIFE (inline script) | Popup |
| popup/popup.html | HTML5 | - | Popup |
| popup/popup.css | CSS3 (custom properties) | - | Popup |
| options/options.js | ES2022, chrome.* API | IIFE (inline script) | Options Page |
| options/options.html | HTML5 | - | Options Page |
| options/options.css | CSS3 | - | Options Page |
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
| Proje baslangici | Zero-dependency | Guvenlik (supply chain), boyut, Chrome Web Store incelemesi |
| Proje baslangici | Manifest V3 | Chrome Web Store V2'yi kabul etmiyor |
| Proje baslangici | DNR (webRequest degil) | MV3'te webRequest blocking yok |
| Proje baslangici | ES modulleri (background) + IIFE (content) | MV3 service worker ESM destekler, content script'ler desteklemez |
| Proje baslangici | node:test (Jest/Mocha degil) | Sifir bagimlilik, Node.js built-in |

---

**Son Guncelleme:** 2026-04-26
**Sonraki Audit:** Her buyuk surum oncesi
**Sahibi:** openShield Gelistirici
