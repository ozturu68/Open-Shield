# Workflow: Ozellik Gelistirme (Feature Development)

## Bu Workflow Ne Ise Yarar?

Bu workflow, yeni bir ozellik gelistirme surecinin adimlarini tanimlar. AI bu workflow'u okudugunda, analizden teste kadar tum sureci sistematik olarak takip eder. openShield MV3 tarayici uzantisi ozgusu: service worker yasam dongusu, DNR kural yonetimi, content script dunya izolasyonu (ISOLATED vs MAIN).

**Ne Zaman Kullanilir:** Kullanici "yeni ozellik ekle", "su ozelligi gelistir", "yeni DNR kurali ekle" dediginde.

**Kac Adim:** 7 ana adim
**Tahmini Sure:** Ozellik karmasikligina gore degisir

---

## On Kosullar (Baslamadan Once)

AI su dosyalari okumali:
1. `AGENTS.md` (kok dizin) — Proje ozeti, dizin yapisi, MV3 kisitlar
2. `.kilo/memory-bank/project-brief.md` — Proje amaci ve kapsami
3. `.kilo/memory-bank/tech-stack.md` — Kullanilan API'ler ve teknolojiler
4. `.kilo/memory-bank/architecture.md` — Mimari kararlar, DNR stratejisi
5. `.kilo/memory-bank/context.md` — Mevcut durum, aktif gorevler
6. `.kilo/rules/coding-standards.md` — Kodlama standartlari
7. `.kilo/rules/architecture-rules.md` — MV3 mimari kurallari

---

## Adim 1: Analiz ve Anlama

**Amac:** Ozelligin ne oldugunu, hangi MV3 bilesenlerini etkileyecegini tam olarak anlamak.

### 1.1. Gereksinimleri Toplama
- [ ] Kullanicidan ozellik tanimini al
- [ ] Hangi bilesen etkilenecek? (service worker / content script / popup / options / DNR rules / manifest)
- [ ] Kabul kriterlerini netlestir
- [ ] MV3 kisitlariyla uyumlu mu? (DNR limitleri, service worker yasam dongusu, izinler)

### 1.2. Mevcut Durum Analizi
- [ ] Benzer ozellikler var mi? `background.js`, `cosmetic.js`, `bounce.js` icinde ara
- [ ] Mevcut DNR kurallari veya content script'ler yeniden kullanilabilir mi?
- [ ] `config.js` ve `utils.js`'ten kullanilacak fonksiyon/sabit var mi?

### 1.3. Kapsam Belirleme
- [ ] MVP kapsami nedir?
- [ ] Yeni DNR ruleset gerekiyor mu? (statik vs dinamik)
- [ ] Yeni content script gerekiyor mu? (ISOLATED vs MAIN world)
- [ ] Yeni manifest permission gerekiyor mu?

**Cikti:** Analiz ozeti (kullaniciya onaylatilir)

---

## Adim 2: Tasarim

**Amac:** MV3 uyumlu mimari tasarimi yapmak.

### 2.1. Modul/Dosya Yapisi
- [ ] Hangi dosyalar olusturulacak?
- [ ] Hangi dosyalar degistirilecek? (manifest.json, background.js, config.js, rules/*.json)
- [ ] Yeni DNR ruleset ekleniyorsa `manifest.json` `rule_resources` guncellenecek

### 2.2. API/Message Tasarimi (Eger yeni message type gerekiyorsa)
- [ ] Yeni mesaj tipi `config.js` MSG sabitine eklenmeli
- [ ] Request/Response formati (input validasyonu zorunlu: `isValidHostname`, `ALLOWED_*_KEYS`)
- [ ] Hata durumlari: `{ error: "invalid parameters" }` formati

### 2.3. Storage Degisiklikleri
- [ ] Yeni storage key gerekiyor mu? `chrome.storage.local` mi `session` mi?
- [ ] Service worker teardown'da veri kaybi olmamasi icin fallback stratejisi
- [ ] In-memory cache (Map) + storage fallback pattern'i kullan

### 2.4. Veri Akisi
- [ ] Service worker → DNR → content script → popup/options akisi nasil olacak?
- [ ] Message passing zinciri: popup → background → executeScript → MAIN world
- [ ] `onRuleMatchedDebug` listener guncellemeleri var mi?

**Cikti:** Tasarim dokumani (kullaniciya onaylatilir)

---

## Adim 3: Implementasyon Oncesi Hazirlik

**Amac:** Kod yazmaya baslamadan once ortami hazirlamak.

### 3.1. Branch Olusturma
```bash
git checkout -b feature/[ozellik-adi]
```

### 3.2. Bagimlilik Kontrolu
- [ ] Yeni npm paketi GEREKLI DEGILSE eklenmez (sifir runtime bagimlilik prensibi)
- [ ] `tools/build.js`'te `archiver` disinda yeni dev bagimliligi kontrol et
- [ ] `.kilo/memory-bank/tech-stack.md` guncellenecek mi?

### 3.3. Prototip (Eger gerekliyse)
- [ ] DNR kural davranisi Chrome'da manuel test edildi mi?
- [ ] Service worker injection MAIN-world'de calisiyor mu? (self-contained kontrolu)
- [ ] Content script ISOLATED world'de dogru calisiyor mu?

**Cikti:** Hazirlik tamamlandi onayi

---

## Adim 4: Kod Implementasyonu

**Amac:** Ozelligi MV3 kurallarina uygun kodlamak.

### 4.1. MV3 Implementasyon Sirasi

```
1. manifest.json           → Yeni izinler, ruleset, content script deklarasyonu
2. src/config.js           → Yeni sabitler, MSG tipleri, storage KEY'leri
3. src/utils.js            → Paylasilan yardimci fonksiyonlar (pure functions)
4. src/background.js       → Service worker mantigi: event listener, message handler, DNR dinamik kural
5. Content Script'ler      → ISOLATED (cosmetic.js, bounce.js) veya MAIN-world (self-contained injection)
6. popup/ veya options/    → UI degisiklikleri
7. rules/*.json            → Yeni statik DNR kurallari
```

### 4.2. MV3 Ozgu Kodlama Kurallari
- [ ] Service worker'da in-memory state'e guvenilmez — storage fallback her zaman var
- [ ] `chrome.scripting.executeScript` ile enjekte edilen fonksiyonlar **self-contained** olmali
- [ ] Content script'ler (manifest-declared) IIFE formatinda, ESM import yapamaz
- [ ] DNR kural ID'leri collision-free: statik (1+), dinamik (100000+ hostname hash tabanli)
- [ ] Input validasyonu tum `chrome.runtime.onMessage` handler'larinda zorunlu

### 4.3. Checkpoint'ler
- [ ] `node tools/build.js` — Manifest ve DNR kural validasyonu
- [ ] Syntax hatasi kontrolu (manuel gozden gecir)

**Cikti:** Implementasyon tamamlandi

---

## Adim 5: Test Yazma

**Amac:** Ozelligin dogru calistigini garantiye almak.

### 5.1. Test Stratejisi
- [ ] Unit testler (`tests/unit/`) — config.js, utils.js, farbling, params
- [ ] `node --test tests/unit/**/*.test.js` ile calistir
- [ ] Yeni test dosyasi: `tests/unit/[ozellik].test.js`

### 5.2. Test Senaryolari
- [ ] Happy path (normal kullanim)
- [ ] Edge case'ler (bos hostname, null input, geçersiz URL)
- [ ] Hata durumlari (gecersiz mesaj tipi, eksik parametre)
- [ ] Service worker teardown simülasyonu (in-memory state kaybi)

**Cikti:** `node --test tests/unit/**/*.test.js` basariyla geciyor

---

## Adim 6: Kod Inceleme (Self-Review)

**Amac:** Kodu gondermeden once MV3 kontrol listesinden gecirmek.

### 6.1. MV3 Ozgu Inceleme
- [ ] Service worker state guvenligi (in-memory → storage fallback var mi?)
- [ ] DNR kural ID collision kontrolu
- [ ] MAIN-world injection function'lari self-contained mi?
- [ ] Manifest permission least-privilege (gereksiz izin eklenmis mi?)
- [ ] Prototype pollution korumasi (`merge()` `__proto__` kontrolu)

### 6.2. Dokumantasyon
- [ ] JSDoc tum export edilen fonksiyonlara eklendi mi?
- [ ] `AGENTS.md` veya memory-bank dosyalari guncellenecek mi?

### 6.3. Final Kontrol
- [ ] `git diff` ile tum degisiklikleri gozden gecir
- [ ] Gereksiz `console.log` kalmadi mi?
- [ ] `node tools/build.js` basarili mi?
- [ ] `node --test tests/unit/**/*.test.js` basarili mi?

**Cikti:** Self-review tamamlandi

---

## Adim 7: Memory Bank Guncellemesi ve Bitis

**Amac:** Proje hafizasini guncellemek.

### 7.1. Memory Bank Guncelleme
- [ ] `.kilo/memory-bank/context.md` → Aktif gorev tamamlandi olarak isaretle
- [ ] `.kilo/memory-bank/history.md` → Yeni mimari karar varsa kaydet
- [ ] `.kilo/memory-bank/tech-stack.md` → Yeni API kullanimi varsa guncelle
- [ ] `.kilo/memory-bank/architecture.md` → Yeni DNR ruleset veya mimari desen varsa ekle

### 7.2. Commit Mesaji
```
feat(bilesen): ozellik aciklamasi

- Detay 1
- Detay 2

Test: node --test tests/unit/**/*.test.js basarili
Build: node tools/build.js basarili
```

### 7.3. Kullaniciya Teslim
```
Ozellik: [Ozellik Adi]
Durum: Tamamlandi

Yapilanlar:
- [Ana dosyalar]
- [Ana degisiklikler]

Test:
- node --test tests/unit/**/*.test.js: [Sonuc]
- node tools/build.js: [Sonuc]

Bilinen Sorunlar:
- [Varsa]
```

---

## Hizli Referans: openShield Commit Kapsamlari

```
feat(dnr)        → DNR kurali degisikligi
feat(background) → Service worker ozellik ekleme
feat(cosmetic)   → Kozmetik filtreleme degisikligi
feat(bounce)     → Bounce detection degisikligi
feat(popup)      → Popup UI degisikligi
feat(options)    → Options sayfasi degisikligi
fix(background)  → Service worker hata duzeltmesi
test(utils)      → Utils testleri
test(config)     → Config testleri
test(farbling)   → Farbling testleri
test(params)     → Params testleri
chore(tools)     → Build araclari
docs(memory)     → Memory bank guncellemesi
refactor(background) → Service worker refactoring
```

---

## SSS

**S: Kullanici "hemen yaz" derse ne yapmaliyim?**
C: Analiz ve tasarim adimlarini kisaltip kullaniciya "hizli modda calisiyorum, MV3 kisitlarini kontrol ediyorum" de.

**S: DNR kurali eklerken nelere dikkat edilmeli?**
C: Statik kural ID'si unique olmali (aynı ruleset icinde). Dinamik kural ID'si 100000-149999 (toggle) veya 150000-199999 (allowlist) araliginda olmali. Priority 1 default.

**S: Yeni content script olusturmak gerekirse?**
C: Manifest'te `content_scripts` dizisine ekle. `world: "ISOLATED"` olarak tanimla. IIFE formatinda yaz (`"use strict"` ile). ESM import YAPILAMAZ.

**S: Test yazma adimini kullanici atlamak isterse?**
C: Uyar: "MV3 uzantisinda ozellikle service worker ve DNR testleri kritik. Regresyon testi yazilmadan merge edilmemeli."
