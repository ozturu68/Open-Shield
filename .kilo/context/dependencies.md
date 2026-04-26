---
last_updated: 2026-04-26
status: current
audit_tool: node tools/build.js, manuel code review
---

# Dependencies — openShield Bagimliliklar

## Bu Dosyanin Amaci

Bu dosya, openShield projesinin **tum bagimliliklarini (API'ler ve arac olarak), yasakli teknolojileri ve sifir bagimlilik prensibini** icerir. AI yeni bir cozum onerirken bu dosyaya bakar.

**openShield SIFIR RUNTIME BAGIMLILIK prensibiyle gelistirilmistir.** Calisma aninda hicbir npm paketi, harici kutuphane veya CDN kullanilmaz. Sadece Web Extension API'leri.

**Ne Zaman Guncellenir:** Yeni chrome API kullanildiginda, build arac degistiginde.

---

## 1. Calisma Zamani "Bagimliliklari" (Web Extension API'leri)

openShield'in "bagimliliklari" aslinda Chrome/Chromium'un sundugu Web Extension API'leridir. Bunlar tarayici tarafindan saglanir, ayrica yukleme gerektirmez.

### 1.1. Temel API'ler (Her zaman kullanilir)

| API | Kullanim Alani | Kritiklik |
|-----|---------------|----------|
| `chrome.runtime` | Message passing, service worker yasam dongusu, onMessage, sendMessage | **KRITIK** |
| `chrome.storage` (local + session) | Kalici ayarlar (local) + oturum verisi (session) | **KRITIK** |
| `chrome.declarativeNetRequest` | Ag filtreleme: statik + dinamik DNR kurallari | **KRITIK** |

### 1.2. Islevsel API'ler (Ozellik bazli)

| API | Kullanim Alani | Ilgili Ozellik |
|-----|---------------|---------------|
| `chrome.scripting.executeScript` | MAIN-world script enjeksiyonu (farbling, WebRTC block, beacon block) | Parmak izi korumasi |
| `chrome.webNavigation` | Navigasyon takibi: onCommitted (injection), onBeforeNavigate (bounce) | Script injection, bounce detection |
| `chrome.tabs` | Sekme durumu: onRemoved, onUpdated, onActivated, get, update | Icon yonetimi, auto shred, bounce |
| `chrome.action` | Toolbar icon: setIcon, setBadgeText, setBadgeBackgroundColor | UI gostergeleri |
| `chrome.browsingData` | Site verisi temizleme: remove (cookies, localStorage, cache, indexedDB, sw) | Auto Shred |
| `chrome.alarms` | Periyodik islemler (henuz kullanilmiyor, gelecekte filter guncelleme) | Planlandi |

### 1.3. Manifest Permission'lari (Hangi API'lere Erisim Var)

| Permission | Gerekce | API |
|-----------|---------|-----|
| `declarativeNetRequest` | DNR kural yonetimi | chrome.declarativeNetRequest |
| `declarativeNetRequestFeedback` | onRuleMatchedDebug (sayaç + log) | chrome.declarativeNetRequest |
| `storage` | Ayarlar ve oturum verisi | chrome.storage |
| `tabs` | Sekme durumu izleme | chrome.tabs |
| `scripting` | MAIN-world script enjeksiyonu | chrome.scripting |
| `webNavigation` | Navigasyon event'leri | chrome.webNavigation |
| `browsingData` | Site verisi temizleme | chrome.browsingData |
| `host_permissions: <all_urls>` | DNR tum sitelerde calisabilmesi | Tum API'ler |

---

## 2. Gelistirme Zamani Bagimliliklari (Dev-Only)

Bunlar sadece build ve test asamalarinda kullanilir. Uzanti paketinde **(zip icinde) YER ALMAZLAR**.

| Arac | Amac | Zorunluluk |
|------|------|-----------|
| Node.js >= 18 | Build araclari ve test calistirma | Zorunlu |
| `node:test` (built-in) | Unit test runner | Zorunlu |
| `node:assert` (built-in) | Test assertion'lar | Zorunlu |
| `archiver` (npm, optional) | `tools/build.js` zip olusturma | Opsiyonel (manuel zip de olur) |
| Git >= 2.x | Versiyon kontrolu | Zorunlu |

**Not:** `archiver` npm paketi sadece `tools/build.js` icinde, `require("archiver")` olarak kullanilir. Bu paket kurulu degilse build zip olusturamaz ama validasyon yine de calisir. `npm install` proje kokunde gerekli DEGILDIR — sadece `npm install archiver` ile tek paket kurulabilir.

---

## 3. DNR Kurallari (Statik Veri Dosyalari)

Bunlar kod/bagimlilik degil, veri dosyasidir. Ancak kritik olduklari icin burada listelenmistir.

| Dosya | Kaynak | Guncelleme Sikligi |
|-------|--------|-------------------|
| `rules/easylist.json` | EasyList (ABP format) → convert-filters.js ile donusturulur | Aylik |
| `rules/easyprivacy.json` | EasyPrivacy (ABP format) → convert-filters.js ile donusturulur | Aylik |
| `rules/params.json` | Manuel kure edilmis tracking parametreleri | Ihtiyac halinde |
| `rules/https_upgrade.json` | HSTS preload list (kismen) | Ihtiyac halinde |
| `rules/headers.json` | Manuel tanimlanmis header kurallari | Ihtiyac halinde |
| `rules/bounce_domains.json` | Manuel kure edilmis bounce domain listesi | Ihtiyac halinde |

---

## 4. Yasakli Teknolojiler (Kullanilamaz)

Bu teknolojiler openShield'de **kesinlikle kullanilamaz**. AI yeni kod uretirken bunlari ONERMEMELIDIR.

| Teknoloji | Yasaklanma Nedeni |
|-----------|------------------|
| **npm paketleri (runtime)** | Sifir bagimlilik prensibi. Guvenlik (supply chain), boyut, Chrome Web Store incelemesi. |
| **TypeScript** | Sadelik, build adimi gereksiz. Proje tercihi: vanilla JavaScript ES2022. |
| **React / Vue / Angular / Svelte** | UI minimal (popup + options ~200 satir). Framework overkill. |
| **jQuery** | Gereksiz. Modern DOM API ve fetch yeterli. |
| **webRequest API** | MV3'te blocking modu kaldirildi. Sadece DNR kullanilabilir. |
| **eval() / new Function()** | Guvenlik riski. CSP ihlali. |
| **localStorage / sessionStorage** | chrome.storage daha guvenli ve MV3 uyumlu. Service worker'da localStorage yok. |
| **CDN / harici script** | Sifir harici istek prensibi. Gizlilik ve guvenlik. |
| **inline script/style (HTML'de)** | MV3 Content Security Policy ihlali. |
| **persistent background page** | MV3'te yok. Sadece service worker. |
| **WebSocket / EventSource (arka planda)** | Service worker'da 30 sn idle sonrasi sonlandirilir. |

---

## 5. Tercih Edilen / Onerilen Cozumler

AI bir sorunu cozerken su sirayla dusunmelidir:

| Ihtiyac | 1. Tercih | 2. Tercih | Kullanilmaz |
|---------|----------|----------|------------|
| Ag filtreleme | DNR static rules | DNR dynamic rules | webRequest |
| Veri saklama | chrome.storage.local | chrome.storage.session | localStorage |
| Script enjeksiyonu | chrome.scripting.executeScript | manifest content_scripts | eval() |
| State yonetimi | chrome.storage + in-memory cache | — | Global degisken |
| Mesajlasma | chrome.runtime.sendMessage | — | window.postMessage |
| String isleme | Vanilla JS string/URL API | Kendi utils.js fonksiyonlari | Harici kutuphane |
| Test | node:test (built-in) | — | Jest, Mocha, Vitest |
| Build | node tools/build.js | — | webpack, vite, rollup |

---

## 6. Guvenlik Durumu

### 6.1. Bagimlilik Guvenligi
openShield sifir runtime bagimliliga sahip oldugu icin:
- Supply chain saldirisi riski: **SIFIR**
- Bilinen CVE'li paket riski: **SIFIR**
- npm audit ihtiyaci: **YOK** (runtime paket yok)

### 6.2. Tek Risk: archiver (Dev-Only)
- `archiver` sadece build aninda kullanilir, zip icine dahil edilmez
- Guvenlik etkisi: Minimal (sadece gelistirme makinesinde)

---

## 7. AI Yeni Cozum Onerirken

AI su sorulari cevaplamalidir:
1. Bu cozum icin yeni bir API/bagimlilik gerekiyor mu?
2. Mevcut chrome.* API'leri bu isi yapabilir mi?
3. Yasakli teknolojiler listesinde bir sey oneriliyor mu?
4. Bu cozum MV3 ile uyumlu mu? (service worker, DNR, CSP)

**Kural:** Yeni bir bagimlilik sadece `manifest.json`'a yeni bir `permission` olarak eklenebilir. Bu da Chrome Web Store incelemesini tetikler — gerekcesi saglam olmalidir.

---

**Son Guncelleme:** 2026-04-26
**Sonraki Audit:** Her surum oncesi
**Sahibi:** openShield Gelistirici
