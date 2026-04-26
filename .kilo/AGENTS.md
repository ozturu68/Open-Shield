---
last_updated: 2026-04-26
owner: ai-integration-team
scope: project
criticality: high
---

# AGENTS.md — openShield Proje AI Ajan Davranis Yonetmeligi

## Bu Dosyanin Amaci

Bu dosya, Kilo Code ve diger AI kodlama asistanlarinin openShield projesinde nasil davranmasi gerektigini belirleyen **ust-duzey yonetmelikleri** icerir. `.kilo/agents/` dizinindeki dosyalar belirli ajanlari tanimlarken, bu dosya **tum ajanlar icin gecerli olan evrensel kurallari** belirtir.

openShield, **bagimsiz, sifir bagimlilikli bir Chromium Manifest V3 tarayici uzantisidir**. Brave Shields benzeri gizlilik korumasi saglar. Tum kod **vanilla JavaScript (ES2022)**, tum API **Web Extension API'leri**, tum veri **chrome.storage** uzerinde yerel olarak saklanir.

---

## 1. Proje Felsefesi ve Yaklasim

### 1.1. AI ile Kodlama Ilkelerimiz

- **AI bir ortak programci (pair programmer) olarak gorulur**, otonom bir kodlayici degil. AI urettigi kodu onerir; karar verme yetkisi her zaman insan gelistiricidedir.
- **Context-first yaklasim**: Kod yazmadan once projenin MV3 mimarisi, service worker kisitlari, DNR sistemi ve mevcut kod stilleri anlasilmalidir.
- **Progressive disclosure**: AI once memory-bank ve context dosyalarini okuyarak projeyi anlar, sonra kod uretir.
- **Tum AI ciktilari insan gozden gecirmeye tabidir.** Otomatik olarak uygulanmaz.

### 1.2. Kod Kalitesi Standartlari

- Uretilen kod **mevcut kod tabaninin stilline uygun** olmalidir. Tutarsiz stiller onerilmez.
- ES2022 syntax, `async/await` tercih edilir.
- JSDoc tum export edilen fonksiyonlarda zorunludur.
- camelCase degisken/fonksiyon, SCREAMING_SNAKE_CASE sabitler.
- Event listener'lar `handle<Event>` formatinda adlandirilir.
- `"use strict"` tum IIFE content script'lerde zorunludur.
- **Guvenlik ilk plandadir**: Input validasyonu, prototype pollution korumasi, DNR kural ID celiskisi onleme.

---

## 2. Proje Mimarisi ve Kilit Kisitlar

### 2.1. MV3 Tarayici Uzantisi Mimarisi

```
Service Worker (background.js, ESM)
  ├── chrome.storage (local + session)
  ├── DNR Static Rules (5 ruleset)
  ├── Dynamic DNR Rules (per-site toggle)
  ├── webNavigation.onCommitted → inject MAIN-world scripts
  └── Message Router (popup ↔ background)

Content Scripts (manifest-declared, ISOLATED world)
  ├── cosmetic.js — CSS hiding + MutationObserver
  └── bounce.js  — bounce domain detection

MAIN-World Injections (executeScript from background)
  ├── installFarbling   — canvas/WebGL/Audio/font noise
  ├── installWebRTCBlock — RTCPeerConnection IP leak prevention
  └── installBeaconBlock — sendBeacon/fetch keepalive blocking

UI
  ├── popup/   — per-site toggle + stats
  └── options/ — global settings, filter lists, allow/block lists
```

### 2.2. Kilit Kisitlar

- **Service Worker** her an sonlandirilabilir. In-memory state'e guvenilmez.
- **declarativeNetRequest** disinda ag filtreleme API'si yoktur. `webRequest` kullanilamaz.
- **Sifir runtime bagimlilik**: Sadece Web Extension API'leri kullanilir. npm paketi yoktur.
- **ES modulleri**: `background.js` ve `import`/`export` kullanan dosyalar ESM'dir. Content script'ler (manifest ile enjekte edilenler) IIFE formatinda olup ESM import yapamaz.
- **Storage**: `chrome.storage.local` kalici ayarlar icin, `chrome.storage.session` oturum bazli veriler (tab counter, seed, log) icin.
- **Kural limitleri**: Maksimum 30.000 statik DNR kurali; maksimum 5.000 dinamik kural.
- **DNR Rule ID araliklari**:
  - Statik kurallar: 1+ (ruleset bazinda artan)
  - Dinamik (shields toggle): 100000–149999 (site hash tabanli)
  - Dinamik (allowlist): 150000–199999 (options sayfasindan)
- `installFarbling` ve diger MAIN-world enjeksiyonlari `chrome.scripting.executeScript` ile serialize edildigi icin **self-contained** olmalidir. Modul scope'undan degisken import edilemez.

---

## 3. Context Yonetimi Kurallari

### 3.1. Goreve Baslama Protokolu (Cold Start)

Her yeni gorevde AI su sirayla context dosyalarini okur:

1. **`AGENTS.md`** (kök dizin) — Proje genel bakisi ve teknik notlar
2. **`.kilo/memory-bank/project-brief.md`** — Projenin amaci ve ozeti
3. **`.kilo/memory-bank/tech-stack.md`** — Kullanilan teknolojiler ve kisitlar
4. **`.kilo/memory-bank/architecture.md`** — Mimari kararlar ve DNR desenleri
5. **`.kilo/memory-bank/context.md`** — Mevcut calisma baglami (aktif ozellikler, bilinen sorunlar)
6. **`.kilo/rules/coding-standards.md`** — Kodlama standartlari
7. **`.kilo/rules/architecture-rules.md`** — Mimari kurallar (MV3 ozel)

**Kural:** Bu dosyalar okunmadan kod uretimi yapilmaz.

### 3.2. Memory Bank Kullanimi

- AI, memory-bank dosyalarini **guncel ve dogru tutmakla yukumludur.**
- Yeni bir mimari karar alindiginda `history.md` dosyasina kaydedilir.
- Teknoloji degisikligi oldugunda `tech-stack.md` guncellenir.
- Aktif gorev degistiginde `context.md` dosyasi guncellenir.
- Memory bank guncellemeleri **ayri bir adim olarak** yapilir, kod ile karistirilmaz.

---

## 4. Arac Kullanim Kurallari

### 4.1. Dosya Araclari (read, edit, glob, grep)

- **read:** Dosya okuma her zaman izinlidir. `manifest.json`, `src/`, `rules/` dizinleri anlasilmadan kod uretilmez.
- **edit:** `background.js`, `manifest.json`, DNR JSON kurallari ve content script'ler degistirilmeden once ilgili dosyanin tamami okunur.
- **glob:** Spesifik kalip kullanilir (`src/**/*.js`, `rules/*.json`, `tests/unit/**/*.test.js`)
- **grep:** Anlamli birimler aranir (fonksiyon adlari, DNR kural pattern'leri, message type sabitleri)

### 4.2. Terminal Araci (bash)

- `git` komutlari otomatik olarak izinlidir (status, diff, log, branch).
- `node tools/build.js` — build dogrulamasi otomatik izinlidir.
- `node --test tests/unit/**/*.test.js` — test calistirma otomatik izinlidir.
- `npm install` ve yikici komutlar **onay gerektirir**.
- Build araclari (`tools/convert-filters.js`, `tools/fetch-lists.js`, `tools/build-hsts.js`, `tools/extract-cosmetic.js`) ihtiyac duyuldugunda calistirilabilir.

### 4.3. Gorev Araci (task)

- Karmasik gorevler alt gorevlere bolunur.
- Her alt gorev icin en uygun alt ajan secilir (`.kilo/agents/` dizininden).
- Alt ajanlarin sonuclari ana goreve dahil edilir.

---

## 5. Kod Uretim Surecleri (openShield Ozel)

### 5.1. Yeni Ozellik Gelistirme

1. **Analiz:** Mevcut kodu oku (`background.js`, `config.js`, `manifest.json`). Hangi modul etkilenecek? Service worker mi, content script mi, popup mi?
2. **Plan:** `.kilo/workflows/feature-development.md` akisini takip et.
3. **Tasarim:** MV3 kisitlarini goz onunde bulundur. Service worker sonlandirmasi, DNR limitleri, storage kullanimini planla.
4. **Implementasyon:** Kod uret. Background degisikliklerinde `in-memory state` kullanma. Content script'lerde IIFE formatini koru. DNR kurallarinda ID celiskisi yaratma.
5. **Test:** Ilgili unit testleri guncelle/olustur. `node --test tests/unit/**/*.test.js` ile dogrula.
6. **Dogrulama:** `node tools/build.js` ile manifest ve DNR kurallarini valide et.
7. **Memory Bank:** Yeni kararlari ve degisiklikleri kaydet.

### 5.2. Hata Cozumu

1. **Hata analizi:** Hata service worker'da mi? Console log kontrolu. DNR kurali mi eslesmedi? `onRuleMatchedDebug` listener'i kontrol et.
2. **Kod incelemesi:** Ilgili dosyalari oku.
3. **Root cause:** Service worker teardown, DNR ID celiskisi, storage senkronizasyonu gibi MV3 ozgu nedenleri degerlendir.
4. **Test:** Cozumu `node --test` ile test et.
5. **Kayit:** Cozumu `history.md` dosyasina kaydet.

### 5.3. Refactoring

1. **Amac belirle:** Neden refactoring? (performans, okunabilirlik, modulerlik)
2. **Etki analizi:** Service worker kodu, content script'ler ve DNR kurallari arasinda bagimlilik zinciri var mi?
3. **Plan:** `.kilo/workflows/refactoring.md` akisini takip et.
4. **Implementasyon:** Ornegin `background.js`'ten bir fonksiyonu `utils.js`'e tasirken ESM import/export zincirini koru. Content script'lere tasima yapilamaz (IIFE).
5. **Test:** `node --test` ile tum testler gecmeli. `node tools/build.js` ile build basarili olmali.

---

## 6. Guvenlik ve Etik Kurallari

### 6.1. Guvenlik Ilkeleri

- Hicbir zaman API anahtarlarini, sifreleri veya gizli bilgileri kod icinde acikca gosterme.
- Kullanici girdileri her zaman sanitize edilmelidir (`isValidHostname`, `isValidDestination` gibi validator fonksiyonlar kullan).
- `chrome.runtime.onMessage` handler'lari input validasyonu yapmali.
- `merge()` fonksiyonunda oldugu gibi prototype pollution korumasi uygula.
- DNR kural ID'leri deterministik fakat collision-free olmali.

### 6.2. Hassas Veri Yonetimi

- `chrome.storage.local`'da kullanici verisi saklanir. Hassas veri tutulmaz.
- Loglama (`pushLog`) kullanici gizliligine saygili olmali.
- `.env` ve gizli dosyalar asla versiyon kontrolune eklenmez.

---

## 7. openShield Ozgu Notlar

### 7.1. Manifest.json Degisiklikleri

- `permissions` alani her degistiginde Chrome Web Store incelemesini tetikler. Gereksiz permission eklenmez.
- `host_permissions` `<all_urls>` korunmali — DNR'in tum sitelerde calismasi icin gerekli.
- `web_accessible_resources` eklenirse content script'lerden erisim kontrol edilmeli.

### 7.2. DNR Kurallari

- Yeni ruleset eklenirse `manifest.json`'da `declarative_net_request.rule_resources`'a eklenmeli.
- Her ruleset'in `id`'si unique olmali ve `enabled: true` olarak baslamali.
- Statik kural degisikligi extension guncellemesi gerektirir.
- Dinamik kural ekleme/cikarma `chrome.declarativeNetRequest.updateDynamicRules` ile yapilir.

### 7.3. Content Script'ler

- `cosmetic.js` ve `bounce.js` manifest'te `world: "ISOLATED"` olarak tanimlidir. Sayfa JS'ine erisemezler.
- MAIN-world enjeksiyonlari (`installFarbling` vb.) `background.js`'ten `chrome.scripting.executeScript` ile yapilir.
- MAIN-world fonksiyonlari self-contained olmalidir — modul scope'una closure referansi iceremez.

### 7.4. Service Worker Yasam Dongusu

- Service worker idle durumda 30 saniye sonra sonlandirilir.
- `logCache` gibi in-memory Map'ler kaybolabilir — `storage.session`'a fallback her zaman olmali.
- `chrome.alarms` kullanilmiyorsa periyodik islem yapilamaz.

---

## 8. Bakim ve Guncelleme

### 8.1. Context Dosyalarinin Yasam Dongusu

- Tum `.kilo/` dosyalari **canli dokumanlardir.**
- Filter listeler guncellendiginde `memory-bank/tech-stack.md` guncellenir.
- Yeni DNR ruleset eklendiginde `memory-bank/architecture.md` guncellenir.
- **AI bu dosyalari otomatik olarak guncelleyebilir.**

### 8.2. Versiyon Kontrolu

- `.kilo/` dizini **Git versiyon kontrolune dahildir.**
- `kilo.jsonc` ve memory-bank dosyalari commit'lenir.
- API anahtarlari iceren local ayarlar `.gitignore`'a eklenir.

---

## 9. Baska Bir AI'in Projeyi Anlamasi

Eger bu projeyi baska bir AI (Claude, ChatGPT, Gemini, vb.) analiz edecekse:

1. **Once `AGENTS.md` (kök dizin)** — Proje ozeti, dizin yapisi, kisitlar.
2. **`.kilo/memory-bank/` dizini** — Projenin gecmisi, mimarisi ve mevcut durumu.
3. **`.kilo/rules/` dizini** — Kodlama kurallari ve MV3 standartlari.
4. **`.kilo/skills/` dizini** — Tarayici uzantisi ozel yetenekler.
5. **Proje yapisi:** `manifest.json`, `src/`, `rules/`, `tools/`, `tests/`.
6. **Dosya bazinda inceleme:** `background.js` → `config.js` → `utils.js` → `cosmetic.js` → content script'ler → `popup/` → `options/`.

---

**Bu dosyanin son guncelleme tarihi:** 2026-04-26
**Sonraki review tarihi:** Her surum guncellemesi sonrasi
**Sahibi:** AI Entegrasyon Ekibi
