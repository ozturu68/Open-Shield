---
last_updated: 2026-04-27
status: active
next_update: 2026-05-03
sprint: v1.6.0 Release
---

# Context — openShield Aktif Calisma Baglami

## Bu Dosyanin Amaci

Bu dosya, openShield projesinin **mevcut aktif durumunu** icerir. AI her yeni gorevde "simdi neredeyiz?" sorusuna buradan cevap bulur.

---

## 1. Aktif Gorevler (Active Tasks)

### 1.1. Devam Eden (In Progress)

| ID | Gorev | Durum | Notlar |
|----|-------|-------|--------|
| T-002 | Tam filter liste build pipeline | %10 | 30K+ kural icin EasyList/AdGuard listeleri fetch+convert. `filters.js` altyapisi hazir, runtime fetch+convert var. Statik build pipeline'a tasinmali. |

### 1.2. Yapilacak (To Do)

| ID | Gorev | Oncelik | Bagimlilik | Notlar |
|----|-------|---------|-----------|--------|
| T-003 | Per-site override DNR entegrasyonu | P1 | - | `SET_SITE` ile gelen site-bazli ayarlar (ads, fp, cookies) DNR kurali olusturmuyor. `effective()` icinde uygulanmali. |
| T-004 | CMP otomatik red | P2 | - | Cookie consent popup'lari icin |
| T-005 | i18n altyapisi | P3 | - | Coklu dil destegi |
| T-006 | Chrome Web Store yayinlamasi | P1 | T-002 | Extension paketleme ve inceleme |
| T-007 | HSTS preload tam liste | P2 | - | Chromium HSTS preload'dan populer 25K domain |
| T-008 | Tracking params senkronizasyonu | P2 | - | `config.js` ve `link-protection.js` arasinda build-time sync |

### 1.3. Tamamlanan (Done)

| ID | Gorev | Notlar |
|----|-------|--------|
| T-000 | Ilk versiyon (v1.0.0) | Temel ozellikler tamam, build+test calisiyor |
| T-001 | `.kilo/` dokumantasyon guncellenmesi | Tum memory-bank, context, skill dosyalari v1.6.0'a guncellendi |
| T-009 | Moduler dizin restructure | Flat `src/` → `src/core/`, `src/background/`, `src/content/`, `src/polyfills/`, `ui/` |
| T-010 | v1.6.0 overhaul | Cohort fix, injection consolidation, UI ayar kontrolleri, badge debounce, guvenlik hardening |

---

## 2. Bilinen Sorunlar (Known Issues)

### 2.1. Aktif Sorunlar

| ID | Sorun | Etki | Notlar |
|----|-------|------|--------|
| I-004 | Blocklist storage'a kaydediliyor ama DNR kurali olusturulmuyor | Orta | `options.js` blocklist'i `storage.local`'a kaydediyor fakat buna karsilik gelen DNR `block` dinamik kurali yok. |
| I-005 | Filter listeler minimal (~185 kural) | Yuksek | Build pipeline ile tam listeler fetch edilip convert edilmeli. `filters.js` runtime'da 4 listeden rule cekiyor ama MAX_PER_LIST=1200 ile sinirli. |
| I-006 | Accept-Language header hardcoded `en-US` | Dusuk | Coklu dil kullanicilari icin sorun olabilir. |
| I-007 | TRACKING_PARAMS duplike | Orta | `config.js` ve `link-protection.js` arasinda 100+ parametre kopyasi var. Build-time sync cozumu planlandi. |
| I-008 | Cohort auto-block DNR kuralinda `urlFilter: \|\|domain^` dinamik kurallarda desteklenmiyor | Yuksek | **v1.6.0'da duzeltildi:** `requestDomains: [domain]` formatina gecildi. |
| I-009 | setDynamic3p global calisiyor, site-bazli degil | Orta | `updateEnabledRulesets` tum siteler icin 3p-block acar/kapar. |

### 2.2. Cozumlenen Sorunlar

| ID | Sorun | Cozum Tarihi |
|----|-------|-------------|
| I-001 | `webrtc.js` IP filtreleme hatali | 2026-04-27 |
| I-002 | `beacon.js` dead code | 2026-04-27 |
| I-003 | `bounce.js` content script redundant | 2026-04-27 |
| I-010 | Cohort DNR format (urlFilter|| → requestDomains) | 2026-04-27 |
| I-011 | MAX_PER_LIST 4000 → 1200 (dynamic limit) | 2026-04-27 |
| I-012 | AMP sayfalarina farbling injection | 2026-04-27 |
| I-013 | AMP_CACHE_DOMAINS dead code | 2026-04-27 |
| I-014 | Options sayfasinda ayar kontrolu yok | 2026-04-27 |
| I-015 | toBlob handler'da gereksiz fetch() | 2026-04-27 |
| I-016 | Wrapped array → WeakSet (MAIN-world guvenlik) | 2026-04-27 |
| I-017 | Badge update debounce eksik | 2026-04-27 |
| I-018 | 5 ayri executeScript → tek installAll() | 2026-04-27 |

---

## 3. Blockers (Engeller)

Su an aktif blocker yok.

---

## 4. Son Kararlar (Recent Decisions)

| Tarih | Karar | Gerekce |
|-------|-------|---------|
| 2026-04-27 | Injection consolidation (ADR-004) | 5 executeScript → 1: IPC reduksiyonu, sira garantisi |
| 2026-04-27 | Moduler dizin yapisi | Flat `src/` → `background/`, `content/`, `core/`, `polyfills/` |
| 2026-04-27 | Cohort DNR `requestDomains` format | Dinamik kurallarda `\|\|domain^` urlFilter calismiyor |
| 2026-04-26 | `.kilo/` dizini openShield'a entegre ediliyor | AI asistanlarinin projeyi daha iyi anlamasi ve tutarli kod uretmesi icin |

---

## 5. AI ile Calisma Durumu

### 5.1. AI Context Guncellemeleri

| Tarih | Dosya | Degisiklik |
|-------|-------|-----------|
| 2026-04-27 | Tum `.kilo/` dosyalari | v1.6.0 durumuna senkronize edildi |
| 2026-04-26 | Tum `.kilo/` dosyalari | Template'den openShield'a uyarlandi |

---

## 6. Kisa Vadeli Hedefler

- [x] `.kilo/` entegrasyonu tamamla
- [x] Dizin yapisini moduler hale getir
- [x] Kritik bug fix'leri (cohort, limit, injection)
- [x] Options sayfasina ayar kontrolleri ekle
- [x] `node tools/build.js` basarili, `node --test` gec
- [ ] Per-site override DNR entegrasyonu
- [ ] Filter liste build pipeline'i aktif et

---

**Son Guncelleme:** 2026-04-27
**Guncelleme Sikligi:** Her gorev sonrasi
**Sahibi:** openShield Gelistirici
