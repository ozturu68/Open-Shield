---
last_updated: 2026-04-26
status: active
next_review: 2026-07-26
---

# Project Brief — openShield Proje Ozeti

## Bu Dosyanin Amaci

Bu dosya, openShield projesinin **en temel bilgilerini** icerir. AI her yeni oturumda ilk okudugu dosyalardan biridir.

---

## 1. Proje Ozeti (Elevator Pitch)

**Proje Adi:** openShield

**Ne Yapar:** Chromium tabanli tarayicilar icin sifir bagimlilikli, Brave Shields benzeri gizlilik korumasi saglayan Manifest V3 tarayici uzantisi. Reklam engelleme, parmak izi korumasi (farbling), HTTPS yukseltme, ucuncu taraf cookie engelleme, bounce tracking korumasi, URL parametre temizleme ve kozmetik filtreleme sunar.

**Hedef Kitle:** Gizlilik bilincine sahip, herhangi bir Chromium tarayici (Chrome, Edge, Brave, Opera, Vivaldi) kullanicilari.

**Temel Deger Onermesi:** Tek bir hafif uzanti ile kapsamli gizlilik korumasi. Sifir bagimlilik, sifir telemetri, tum veri yerel.

---

## 2. Proje Kapsami (Scope)

### 2.1. Dahil Olanlar (In Scope)
- [x] Reklam ve tracker DNR tabanli engelleme (EasyList + EasyPrivacy)
- [x] Parmak izi korumasi (Canvas, WebGL, Audio, font farbling)
- [x] WebRTC IP sizintisi engelleme
- [x] Navigasyon beacon/ping engelleme
- [x] HTTPS otomatik yukseltme (HSTS preload)
- [x] Ucuncu taraf cookie/header engelleme
- [x] URL izleme parametresi temizleme
- [x] Kozmetik CSS reklam gizleme (MutationObserver)
- [x] Bounce tracking tespiti
- [x] Per-site shields toggle
- [x] Auto shred (sekme kapandiginda site verisi temizleme)
- [x] Popup UI (site bazli istatistikler ve toggle)
- [x] Options sayfasi (global ayarlar, filter listeler, allowlist/blocklist)

### 2.2. Disinda Olanlar (Out of Scope - Su An)
- [ ] iOS/Android mobil tarayici destegi (Firefox Android'de kismen)
- [ ] Manifest V2 destegi
- [ ] i18n/coklu dil destegi
- [ ] Sync across devices
- [ ] Otomatik filter liste guncellemeleri (manuel build gerektirir)

### 2.3. Gelecekte Dusunulenler (Roadmap)
- [ ] HSTS preload tam liste (Chromium kaynagindan)
- [ ] Tam filter liste build pipeline (30K+ kural)
- [ ] CMP (Consent Management Platform) otomatik red
- [ ] Firefox MV3 destegi
- [ ] i18n destegi

---

## 3. Kistlar (Constraints)

- **Teknik:** Manifest V3 (service worker, DNR sadece). `webRequest` API yok. Sifir runtime bagimlilik.
- **Kural limiti:** 30.000 statik DNR kurali, 5.000 dinamik kural.
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
- [x] Unit test coverage (node --test hatasiz)
- [x] MV3 manifest validasyonu basarili
- [x] DNR kural validasyonu basarili (duplicate ID, limit kontrol)
- [ ] Chrome Web Store incelemesinden gecme

### 5.2. Gizlilik Kriterleri
- [x] Sifir telemetri
- [x] Tum veri yerel (chrome.storage)
- [x] Harici istek yok (calisma aninda)
- [x] Parmak izi yuzeyini azaltma (farbling)

---

## 6. Riskler ve Azaltma Stratejileri

| Risk | Olasilik | Etki | Azaltma |
|------|---------|------|---------|
| MV3 DNR limiti asimi | Orta | Yuksek | Incremental ruleset, dynamic rules optimize |
| Chrome Web Store reddi | Orta | Kritik | Permission kucultme, MV3 uyumlulugu |
| Service worker teardown veri kaybi | Dusuk | Orta | storage.session fallback her yerde |
| Filter liste guncelleme zorlugu | Orta | Orta | Otomatik fetch + convert pipeline |
| DNR ID collision | Dusuk | Dusuk | Hash-based deterministik ID, range bolme |

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

**Son Guncelleme:** 2026-04-26
**Sonraki Review:** Her 3 ay
**Sahibi:** openShield Gelistirici
