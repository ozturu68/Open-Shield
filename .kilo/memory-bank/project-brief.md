---
last_updated: 2026-04-27
status: active
next_review: 2026-07-27
version: 1.6.0
---

# Project Brief — openShield Proje Ozeti

## Bu Dosyanin Amaci

Bu dosya, openShield projesinin **en temel bilgilerini** icerir. AI her yeni oturumda ilk okudugu dosyalardan biridir.

---

## 1. Proje Ozeti (Elevator Pitch)

**Proje Adi:** openShield

**Ne Yapar:** Chromium tabanli tarayicilar icin sifir bagimlilikli, Brave Shields benzeri gizlilik korumasi saglayan Manifest V3 tarayici uzantisi. Reklam engelleme, parmak izi korumasi (farbling), HTTPS yukseltme, ucuncu taraf cookie engelleme, bounce tracking korumasi, URL parametre temizleme, kozmetik filtreleme, social embed korumasi, XSS/clickjack tespiti ve privacy-badger tarzi tracker ogrenme sunar.

**Hedef Kitle:** Gizlilik bilincine sahip, herhangi bir Chromium tarayici (Chrome, Edge, Brave, Opera, Vivaldi) kullanicilari.

**Temel Deger Onermesi:** Tek bir hafif uzanti ile kapsamli gizlilik korumasi. Sifir bagimlilik, sifir telemetri, tum veri yerel.

---

## 2. Proje Kapsami (Scope)

### 2.1. Dahil Olanlar (In Scope)
- [x] Reklam ve tracker DNR tabanli engelleme (EasyList + EasyPrivacy + uBlock + AdGuard)
- [x] Parmak izi korumasi (Canvas, WebGL, Audio, font farbling — 4 seviye: low/medium/high/strict)
- [x] WebRTC IP sizintisi engelleme (private IPv4/IPv6 filtering)
- [x] Navigasyon beacon/ping engelleme (sendBeacon + keepalive fetch)
- [x] HTTPS otomatik yukseltme (HSTS preload)
- [x] Ucuncu taraf cookie/header engelleme (25 header kurali, Client Hints korumasi)
- [x] URL izleme parametresi temizleme (DNR queryTransform + 100+ parametre)
- [x] Kozmetik CSS reklam gizleme (36 selector + 9 procedural operator, MutationObserver)
- [x] Bounce tracking tespiti (9 domain, redirect bypass)
- [x] Per-site shields toggle (popup uzerinden)
- [x] Auto shred (sekme kapandiginda site verisi temizleme — cookies, localStorage, indexedDB)
- [x] Popup UI (site bazli toggle, 3 istatistik, 6 koruma badge'i)
- [x] Options sayfasi (15 ayar kontrolu, cohort tracker insights, global istatistikler)
- [x] Global Privacy Control (GPC + DNT sinyali)
- [x] Link tracking korumasi (sayfa ici href scrub, click-time cross-origin strip)
- [x] Click-to-load (18 sosyal medya platformu, DOM API ile placeholder)
- [x] XSS & Clickjacking korumasi (reflected XSS tespiti, seffaf overlay tespiti)
- [x] AMP korumasi (canonical redirect)
- [x] Procedural cosmetic filtering (9 uBlock tarzi operator)
- [x] Learning mode (heuristic tracker sinyal isleme, otomatik cohort block)
- [x] Privacy Badger tarzi cohort tracking (cross-site tracker tespiti, auto-block)
- [x] Otomatik filter guncelleme (chrome.alarms ile gunluk, 4 filter source)
- [x] Firefox compatibility (browser-polyfill, gecko manifest)

### 2.2. Disinda Olanlar (Out of Scope - Su An)
- [ ] iOS/Android mobil tarayici destegi (Firefox Android'de kismen)
- [ ] Manifest V2 destegi
- [ ] i18n/coklu dil destegi
- [ ] Sync across devices
- [ ] CMP otomatik red

### 2.3. Gelecekte Dusunulenler (Roadmap)
- [ ] HSTS preload tam liste (Chromium kaynagindan ~200K domain, top 25K)
- [ ] Tam filter liste build pipeline (30K+ kural, statik ruleset)
- [ ] Per-site override DNR entegrasyonu (ads/fp/cookies per-site DNR yansitma)
- [ ] CMP (Consent Management Platform) otomatik red
- [ ] Firefox tam MV3 destegi
- [ ] i18n destegi
- [ ] Chrome Web Store yayinlamasi

---

## 3. Kistlar (Constraints)

- **Teknik:** Manifest V3 (service worker, DNR sadece). `webRequest` API yok. Sifir runtime bagimlilik.
- **Kural limiti:** 30.000 statik DNR kurali (185 kullaniliyor), 5.000 dinamik kural.
- **Service worker:** 30 saniye idle sonrasi sonlandirma. In-memory state guvenilmez.
- **Lisans:** MIT

---

## 4. Rakip ve Pazar Analizi

| Rakip | Guclu Yonu | Zayif Yonu | Bizim Farkimiz |
|-------|-----------|-----------|---------------|
| Brave Shields | Native entegrasyon, en kapsamli | Sadece Brave tarayicida | Tum Chromium tarayicilarda calisir |
| uBlock Origin | En kapsamli filtre listeleri | MV3 ile sinirlanacak, karmasik UI | Basit, Brave tarzi korumalar |
| Privacy Badger | Otomatik tracker ogrenme | Sadece tracker odakli | Kapsamli (reklam+farbling+bounce+params) |
| Ghostery | Genis veritabani | Ticari, telemetri icerir | Acik kaynak, sifir telemetri |

---

## 5. Basari Kriterleri

### 5.1. Teknik Kriterler
- [x] Dependency-free build (node tools/build.js basarili)
- [x] Unit test coverage (78/78 pass — node --test hatasiz)
- [x] MV3 manifest validasyonu basarili
- [x] DNR kural validasyonu basarili (duplicate ID, limit kontrol)
- [ ] Chrome Web Store incelemesinden gecme

### 5.2. Gizlilik Kriterleri
- [x] Sifir telemetri
- [x] Tum veri yerel (chrome.storage)
- [x] Harici istek yok (calisma aninda; filter guncelleme kullanici kontrollu)
- [x] Parmak izi yuzeyini azaltma (farbling, WebRTC IP koruma, CH header temizleme)

---

## 6. Riskler ve Azaltma Stratejileri

| Risk | Olasilik | Etki | Azaltma |
|------|---------|------|---------|
| MV3 DNR limiti asimi | Orta | Yuksek | Incremental ruleset, MAX_PER_LIST=1200, 185/30000 kullaniliyor |
| Chrome Web Store reddi | Orta | Kritik | Permission kucultme, MV3 uyumlulugu, sifir telemetri |
| Service worker teardown veri kaybi | Dusuk | Orta | storage.session write-through cache her yerde |
| Filter liste guncelleme zorlugu | Orta | Orta | chrome.alarms ile otomatik fetch+convert, ALLOWED_HOSTS kontrolu |
| DNR ID collision | Dusuk | Dusuk | Hash-based deterministik ID, 6 ayri range |
| Dinamik DNR urlFilter kisitlari | Dusuk | Dusuk | Cohort requestDomains formatina gecildi |

---

## 7. AI ile Kodlama Stratejisi

### 7.1. Bu Projede AI Nasil Kullaniliyor?
- Kod uretimi (ozellik gelistirme, DNR kural olusturma)
- Kod incelemesi (security audit, MV3 uyumluluk kontrolu)
- Dokumantasyon (JSDoc, memory-bank guncelleme)
- Test yazma (unit testler)
- Mimari danismanlik (DNR stratejisi, service worker optimizasyonu)

### 7.2. AI Kullanim Kurallari
- AI urettigi kod mutlaka insani review edilir
- Guvenlik ve gizlilik kritik (telemetri eklenmez, API anahtari sizmaz)
- AI context dosyalari (.kilo/) duzenli guncellenir
- AI'in urettigi kod mevcut JS stil ve MV3 kisitlarina uygun olmalidir

---

**Son Guncelleme:** 2026-04-27
**Sonraki Review:** Her 3 ay
**Sahibi:** openShield Gelistirici
