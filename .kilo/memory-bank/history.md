---
last_updated: 2026-04-27
total_records: 6
---

# History — openShield Karar Tarihcesi ve Ogrenilen Dersler

## Bu Dosyanin Amaci

Bu dosya, openShield projesinin **gecmisinde alinan onemli kararlari, yasanan hatalari ve ogrenilen dersleri** icerir.

---

## 1. Mimari ve Tasarim Kararlari

### 2026-Q1: Proje Baslangici ve Temel Mimari Kararlar

- **Kategori:** Mimari
- **Durum:** Kabul edildi
- **Karar:** Sifir bagimlilikli, ES2022 JavaScript, MV3 tarayici uzantisi olarak gelistirme.
- **Gerekce:** Guvenlik (supply chain), basitlik, Chrome Web Store uyumlulugu.
- **Kim:** openShield gelistiricisi
- **Etkisi:** Tum kod tabani bu karar uzerine kuruldu. npm runtime dependency yok. Build araclari sadece gelistirme asamasinda.
- **Alternatifler:** TypeScript (reddedildi: build adimi ekler, MV3 content script'ler ile uyumsuz), React popup (reddedildi: overkill, bundle boyutu).

---

### 2026-Q1: DNR Kural Mimarisi

- **Kategori:** Mimari
- **Durum:** Kabul edildi
- **Karar:** Statik kurallar (manifest deklare), dinamik kurallar (per-site toggle + allowlist). Hash tabanli ID uretimi (100000 + hash % 50000).
- **Gerekce:** MV3 zorunlulugu. ID collision riskini kabul edilebilir seviyede tutmak icin modulo 50000.
- **Etkisi:** DNR ID araligi yonetimi kritik. Yeni ruleset eklenirken collision riski goz onunde bulundurulmali.
- **Sonuc:** Basarili. Simdilik collision yok.

---

### 2026-Q1: ES Modules + IIFE Hibriti

- **Kategori:** Mimari
- **Durum:** Kabul edildi
- **Karar:** `background.js` ESM, content script'ler IIFE, UI script'leri inline.
- **Gerekce:** MV3 service worker `type: "module"` destekler, ancak manifest content script'leri ESM import yapamaz.
- **Etkisi:** Kod tekrari (popup/options'ta utils.js fonksiyonlari duplike). Bilincli bir trade-off.
- **Sonuc:** Calisiyor. Kod tekrari minimal (sadece `norm()`, `browser()` gibi 3-5 satirlik fonksiyonlar).

---

## 2. Hata ve Sorun Kayitlari

### 2026-04-26: Kod Analizi Bulgulari

- **Kategori:** Kod kalitesi
- **Oncelik:** P2
- **Sorun:** `.kilo/` entegrasyonu sirasinda yapilan kod analizinde bulunan sorunlar:
  1. `webrtc.js` IP filtreleme mantigi ters — public IP'leri tutuyor, private'lari filtreliyor.
  2. `beacon.js` ve `webrtc.js` standalone dosyalari dead code — `background.js` inline versiyonlari kullaniliyor.
  3. `bounce.js` content script'i `background.js`'teki `onBeforeNavigate` handler'i ile redundant.
  4. `options.js` blocklist'i DNR kurali olarak uygulamiyor.
  5. Filter liste kurallari minimal (~100, tam liste 30K+).
- **Kok Neden:** Hizli prototip gelistirme, build pipeline henuz tam entegre degil.
- **Cozum:** Backlog'a eklendi. Onceliklendirme yapilacak.
- **Onlem:** Build pipeline tamamlaninca filter listeler genisleyecek. Dead code temizligi yapilacak.

---

### 2026-04-27: Kritik Guvenlik ve Mimari Duzeltmeler

- **Kategori:** Guvenlik + Mimari
- **Durum:** Tamamlandi
- **Duzeltmeler:**
  1. `security.js`: `debugger` ifadesi kaldirildi, window dimension ile DevTools tespiti
  2. `webrtc.js`: `isPrivateIPv4`/`isPrivateIPv6` fonksiyonlari eklendi (127.0.0.1, 0.0.0.0, IPv6 dahil)
  3. `background.js`: DNR ID araligi duzeltildi — COHORT_DNR_START 60,000 → 300,000 (filtre listesi ile cakisma)
  4. `background.js`: `cohortCache` dead code kaldirildi
  5. `options.js`: DNR API'ye dogrudan erisim kaldirildi, message passing ile `SET_RULESET` ve `SET_ALLOWLIST` handler'lari eklendi
  6. `cosmetic.js`: MutationObserver debounce (50ms setTimeout) ve `requestIdleCallback` fallback eklendi
- **Gerekce:** Security audit sonrasi kritik bulgularin acil duzeltilmesi
- **Kim:** AI assistant ile yapilan analiz sonrasi
- **Etkisi:** Tum testler geciyor (75/75), build basarili

---

## 3. Ogrenilen Dersler

### Service Worker State Yonetimi

- **Kategori:** Teknik
- **Olay:** Service worker'in 30 saniye idle sonrasi sonlandirilmasi ve in-memory Map'lerin kaybolmasi.
- **Ders:** In-memory state sadece cache olarak kullanilmali, her zaman `storage.session`'a yazilmali ve okuma sirasinda fallback yapilmali.
- **Eylem:** Tum state yonetiminde write-through cache pattern'i uygulandi.

### DNR Kural ID Collision Riski

- **Kategori:** Teknik
- **Olay:** Hash-based ID uretiminde (100000 + hash % 50000) birthday paradox nedeniyle ~10 site'de %0.1 collision olasiligi.
- **Ders:** Deterministik ID uretimi basit ama collision riskli. Buyuk olcekte daha saglam bir ID stratejisi gerekebilir.
- **Eylem:** Simdilik kabul edilebilir. Eger gercek collision yasanirsa, chaining veya rehashing stratejisi eklenecek.

### MAIN-world Script Serialization

- **Kategori:** Teknik
- **Olay:** `chrome.scripting.executeScript` ile enjekte edilen fonksiyonlar string olarak serialize edilir. Modul scope'una referans (closure) calismaz.
- **Ders:** `installFarbling`, `installWebRTCBlock`, `installBeaconBlock` gibi fonksiyonlar tamamen self-contained olmali. Import edilen degisken, fonksiyon referansi icermemeli.
- **Eylem:** Tum MAIN-world enjeksiyonlari dosyanin ustunde inline tanimlandi ve dis referans icermiyor.

---

## 4. Sprint Ozetleri

### Ilk Surum (v1.0.0)

- **Tamamlanan:** Temel gizlilik korumalari (ads, fp, https, cookies, bounce, params, cosmetic, shred), popup UI, options sayfasi, build validasyonu, unit testler.
- **Eksik:** Tam filter listeler, i18n, CMP otomatik red, Chrome Web Store yayini.

### v1.5.0 - Kapsamli Guvenlik ve UX Iyilestirmeleri (2026-04-27)

- **Tamamlanan:**
  - Backend: `tabCountersCache` write-through cache yonetimi, `setShields` ile JS block kural temizligi, cohort ID collision koruması (`% 10000`)
  - Content scripts: `click-to-load.js` innerHTML kaldirildi (SVG DOM API ile), `security.js` duplicate call onleme
  - Frontend: Popup'da protection badges (Ads, FP, Params, Cookies), status description, gelismis layout; Options sayfasi yeniden organize edildi (Protection Level, Fingerprinting, Network Security, Privacy, Advanced section'lari)
- **Test:** Tum unit testler gecti, build basarili
- **Git:** Son surum hazirlandi

---

## 5. Basarili Pattern'ler

### Write-Through Cache Pattern

- **Aciklama:** In-memory Map (cache) + storage.session (persistent) ayni anda yazilir. Okumada once cache, yoksa storage.
- **Nerede Calisiyor:** `counters()`, `pushLog()`, `getLog()`
- **Neden Calisiyor:** Service worker teardown'a dayanikli. Cache hit durumunda hizli, miss durumunda veri kaybi yok.

### Hash-Based DNR ID Generation

- **Aciklama:** Site hostname'inden deterministik hash ile DNR kural ID'si uretme.
- **Nerede Calisiyor:** `allowId()` in background.js
- **Neden Calisiyor:** Ayni site her zaman ayni ID'yi alir. Kural ekleme/cikarma idempotent.

---

**Son Guncelleme:** 2026-04-26
**Sonraki Review:** Her sprint retrospective sonrasi
**Sahibi:** openShield Gelistirici
