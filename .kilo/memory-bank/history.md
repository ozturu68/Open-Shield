---
last_updated: 2026-04-27
total_records: 9
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
- **Karar:** Statik kurallar (manifest deklare), dinamik kurallar (per-site toggle + allowlist). Hash tabanli ID uretimi.
- **Gerekce:** MV3 zorunlulugu. ID collision riskini kabul edilebilir seviyede tutmak icin modulo aralik korumasi.
- **Etkisi:** DNR ID araligi yonetimi kritik.
- **Sonuc:** Basarili. v1.6.0'da cohort ID araligi 300K-310K'ya duzeltildi. Dinamik filter ID'leri 10K-60K arasinda.

---

### 2026-Q1: ES Modules + IIFE Hibriti

- **Kategori:** Mimari
- **Durum:** Kabul edildi
- **Karar:** Service worker ESM, content script'ler IIFE, UI script'leri inline IIFE.
- **Gerekce:** MV3 service worker `type: "module"` destekler, ancak manifest content script'leri ESM import yapamaz.
- **Etkisi:** Kod tekrari (popup/options'ta utils.js fonksiyonlari duplike). Bilincli bir trade-off.
- **Sonuc:** Calisiyor. Kod tekrari minimal.

---

### 2026-04-27: Modular Directory Restructure (v1.6.0)

- **Kategori:** Mimari
- **Durum:** Tamamlandi
- **Karar:** Flat `src/` → `src/core/` (config, utils), `src/background/` (8 modul), `src/content/` (5 script), `src/polyfills/`, `ui/popup/`, `ui/options/`
- **Gerekce:** Kod buyudukce moduler yapi zorunlu hale geldi. 230+ satir `background.js` okunamaz hale gelmisti.
- **Etkisi:** 15 dosya tasindi, import path'leri guncellendi. Testlerle valide edildi.
- **Sonuc:** 8 background modulu bagimsiz test edilebilir. Content script'ler kendi dizininde.

---

### 2026-04-27: Injection Consolidation (ADR-004, v1.6.0)

- **Kategori:** Mimari
- **Durum:** Tamamlandi
- **Karar:** `installAll(seed, factor, learning)` tek fonksiyonda GPC + Farbling + WebRTC + Beacon + Learning injection'lari birlestirildi.
- **Gerekce:** 4-5 `executeScript` IPC cagrisi → 1 cagri. Performans, sira garantisi, kod sadeligi.
- **Etkisi:** `injections.js`'te `installAll` export. `index.js` sadece bu fonksiyonu cagiriyor.

---

## 2. Hata ve Sorun Kayitlari

### 2026-04-26: Kod Analizi Bulgulari (Ilk Audit)

- **Kategori:** Kod kalitesi
- **Oncelik:** P2
- **Sorun:** Ilk kod analizinde tespit edilen 5 sorun (IP filtreleme, dead code, redundant script, eksik blocklist DNR, minimal filter)
- **Kok Neden:** Hizli prototip gelistirme, build pipeline henuz tam entegre degil.
- **Cozum:** Backlog'a eklendi. Cozumler v1.5.0 ve v1.6.0'da uygulandi.

---

### 2026-04-27: Kritik Guvenlik ve Mimari Duzeltmeler (v1.5.0)

- **Kategori:** Guvenlik + Mimari
- **Durum:** Tamamlandi
- **Duzeltmeler:**
  1. `security.js`: `debugger` ifadesi kaldirildi, window dimension ile DevTools tespiti
  2. `webrtc.js`: `isPrivateIPv4`/`isPrivateIPv6` fonksiyonlari eklendi
  3. `background.js`: DNR ID araligi duzeltildi — COHORT_DNR_START 60,000 → 300,000
  4. `background.js`: `cohortCache` dead code kaldirildi
  5. `options.js`: DNR API'ye dogrudan erisim kaldirildi, message passing eklendi
  6. `cosmetic.js`: MutationObserver debounce + `requestIdleCallback` fallback
- **Etkisi:** Tum testler geciyor, build basarili

---

### 2026-04-27: v1.6.0 — Comprehensive Overhaul

- **Kategori:** Bug Fix + Performance + Security + UI
- **Durum:** Tamamlandi
- **Duzeltmeler:**
  1. **Critical:** `cohort.js` DNR format `urlFilter:||domain^` → `requestDomains:[domain]` (dinamik kurallarda || desteklenmez)
  2. **Critical:** `MAX_PER_LIST` 4000 → 1200 (4 liste x 1200 = 4800, 5K limit altinda)
  3. **Performance:** Badge text update debounce (skip unchanged), 5 executeScript → 1 `installAll()`, MObserver text-node early return
  4. **Security:** `wrapped` array → WeakSet, `toBlob` handler'dan fetch() kaldirildi (base64→Blob direkt)
  5. **UI:** Options sayfasina 15 ayar kontrolu (toggle + select), Popup'a 6 koruma badge'i
  6. **Cleanup:** AMP_CACHE_DOMAINS dead code kaldirildi, AMP sayfalarina farbling atlandi
  7. **Docs:** AGENTS.md, architecture.md, README.md dizin yapisi guncellendi
- **Etkisi:** 78/78 test pass, build valid. GitHub'a push edildi.

---

## 3. Ogrenilen Dersler

### Service Worker State Yonetimi

- **Kategori:** Teknik
- **Olay:** Service worker'in 30 saniye idle sonrasi sonlandirilmasi ve in-memory Map'lerin kaybolmasi.
- **Ders:** In-memory state sadece cache olarak kullanilmali, her zaman `storage.session`'a yazilmali ve okuma sirasinda fallback yapilmali.
- **Eylem:** Tum state yonetiminde write-through cache pattern'i uygulandi. `tabCountersCache`, `logCache` Map'leri her zaman storage.session ile senkronize.

### DNR Kural ID Collision Riski

- **Kategori:** Teknik
- **Olay:** Hash-based ID uretiminde birthday paradox.
- **Ders:** Deterministik ID uretimi basit ama collision riskli. ID araliklari iyi ayrilmali.
- **Eylem:** Statik(1+), Filter(10K-60K), Toggle(100K-150K), Allowlist(150K-200K), JS Block(200K-250K), Cohort(300K-310K) araliklari ayrildi.

### MAIN-world Script Serialization

- **Kategori:** Teknik
- **Olay:** `executeScript` ile enjekte edilen fonksiyonlar string serialize edilir. Modul scope referansi calismaz.
- **Ders:** Tum MAIN-world fonksiyonlari self-contained olmali, tum veri `args` parametresi ile gecilmeli.
- **Eylem:** `installAll`, `installFarbling`, `installWebRTCBlock`, `installBeaconBlock`, `installLearningObserver`, `installGPC` tumu `injections.js` icinde self-contained.

### Dinamik DNR'da urlFilter Kisitlari

- **Kategori:** Teknik
- **Olay:** `urlFilter: "||domain^"` formatindaki ABP domain anchor'i (`||`) **sadece statik ruleset kurallarinda** calisiyor. Dinamik kurallarda bu prefix ignore edilir veya hata verir.
- **Ders:** Dinamik DNR kurallarinda domain bazli engelleme icin `requestDomains` veya `initiatorDomains` kullanilmali.
- **Eylem:** `cohort.js` `autoBlockCohort` `requestDomains` kullanacak sekilde duzeltildi.

---

## 4. Sprint Ozetleri

### Ilk Surum (v1.0.0)

- **Tamamlanan:** Temel gizlilik korumalari, popup UI, options sayfasi, build validasyonu, unit testler.
- **Eksik:** Tam filter listeler, i18n, CMP, Chrome Web Store yayini.

### v1.5.0 - Guvenlik ve UX Iyilestirmeleri (2026-04-27)

- **Tamamlanan:** DNR ID collision fix, write-through cache, innerHTML sanitization, duplicate call onleme, Popup/Options UI redesign.
- **Test:** Tum unit testler gecti, build basarili.

### v1.6.0 - Comprehensive Overhaul (2026-04-27)

- **Tamamlanan:**
  - Backend: Cohort DNR fix (`requestDomains`), injection consolidation (`installAll`), badge debounce, AMP farbling skip
  - Frontend: Options ayar kontrolleri (15 widget), Popup protection badges (6 badge)
  - Security: WeakSet wrapped, fetch-free toBlob, dead code temizligi
  - Architecture: Moduler dizin yapisi (15 file move), ADR-004 injection consolidation
  - Docs: AGENTS.md, tüm .kilo/ memory-bank dosyalari guncellendi
  - Build: .gitignore eklendi, MAX_PER_LIST=1200
- **Test:** 78/78 passing, build valid, GitHub'a push edildi

---

## 5. Basarili Pattern'ler

### Write-Through Cache Pattern

- **Aciklama:** In-memory Map (cache) + storage.session (persistent) ayni anda yazilir. Okumada once cache, yoksa storage.
- **Nerede Calisiyor:** `counters()`, `pushLog()`, `getLog()`, `settings.js`
- **Neden Calisiyor:** Service worker teardown'a dayanikli. Cache hit durumunda hizli, miss durumunda veri kaybi yok.

### Hash-Based DNR ID Generation

- **Aciklama:** Site hostname'inden deterministik hash ile DNR kural ID'si uretme.
- **Nerede Calisiyor:** `allowId()`, `jsBlockId()`, `cohortId()` in `dnr.js`
- **Neden Calisiyor:** Ayni site her zaman ayni ID'yi alir. Kural ekleme/cikarma idempotent.

### Consolidated MAIN-world Injection

- **Aciklama:** Tum MAIN-world script enjeksiyonlari tek `installAll()` fonksiyonunda toplanir.
- **Nerede Calisiyor:** `installAll()` in `injections.js`, `injectAll()` in `index.js`
- **Neden Calisiyor:** 5 `executeScript` IPC cagrisi → 1 cagri. Performans artisi, injection sirasi garantisi, kod sadeligi.

---

**Son Guncelleme:** 2026-04-27
**Sonraki Review:** Her sprint retrospective sonrasi
**Sahibi:** openShield Gelistirici
