# Workflow: Kod Inceleme (Code Review)

## Bu Workflow Ne Ise Yarar?

Bu workflow, yapay zeka ile kod incelemesinin nasil yapilacagini tanimlar. openShield'e ozgu inceleme kontrolleri: service worker state guvenligi, DNR kural ID collision onleme, permission least-privilege, prototype pollution korumasi, MAIN-world injection self-contained kontrolu.

**Ne Zaman Kullanilir:** Kullanici "su PR'i review et", "kodu incele", "kalite kontrol yap", "guvenlik kontrolu yap" dediginde.

**Kac Adim:** 6 ana adim
**Tahmini Sure:** PR buyuklugune gore

---

## On Kosullar (Baslamadan Once)

AI su dosyalari okumali:
1. `.kilo/rules/coding-standards.md` — Kodlama standartlari
2. `.kilo/rules/security-rules.md` — Guvenlik kurallari
3. `.kilo/rules/architecture-rules.md` — MV3 mimari kurallari
4. `.kilo/memory-bank/context.md` — Aktif calisma baglami
5. `manifest.json` — Mevcut izinler ve yapilandirma

---

## Adim 1: PR / Kod Parcasi Hakkinda Genel Bilgi

**Amac:** Incelenecek kodun context'ini anlamak.

### 1.1. PR Bilgilerini Toplama
- [ ] PR basligi ve aciklamasi nedir?
- [ ] Hangi MV3 bileseni degisiyor? (background / content script / popup / options / DNR / manifest)
- [ ] Kac dosya degismis?
- [ ] Manifest.json degisikligi var mi? (izinler, ruleset'ler)

### 1.2. Boyut Degerlendirmesi
| Boyut | Satir | Inceleme Yaklasimi |
|-------|-------|-------------------|
| XS | < 50 | Hizli, tum detaylari incele |
| S | 50-150 | Detayli inceleme |
| M | 150-400 | Odakli inceleme (onemli dosyalar: background.js, manifest.json) |
| L | 400+ | Stratejik inceleme (sadece MV3 kritik dosyalar) |
| XL | 1000+ | "Bu PR cok buyuk, bolunmesi onerilir" |

**Cikti:** PR hakkinda genel degerlendirme

---

## Adim 2: Dosya Bazli Inceleme

**Amac:** Her dosyayi openShield ozgu kontrollerle incelemek.

### 2.1. Inceleme Sirasi (openShield Oncelikli)
```
1. manifest.json         → Permission, ruleset, content_scripts kontrolu
2. src/background.js     → Service worker state, DNR, injection, message handler
3. src/config.js         → Sabitler, MSG tipleri, storage KEY'leri
4. src/utils.js          → Pure functions, prototype pollution korumasi
5. Content script'ler    → IIFE formati, "use strict", ESM import YOK
6. popup/options         → UI mantigi, message passing
7. rules/*.json          → DNR kural ID, priority, condition
8. Test dosyalari        → Test kalitesi, MV3 mock'lar
```

### 2.2. Her Dosya Icin openShield Kontrolleri

**manifest.json:**
- [ ] `permissions` least-privilege (sadece gerekli izinler)
- [ ] `host_permissions` `<all_urls>` var mi? (DNR icin gerekli)
- [ ] `declarative_net_request.rule_resources` her ruleset icin unique `id`
- [ ] `content_scripts` `world: "ISOLATED"` olarak tanimlanmis mi?
- [ ] Gereksiz `web_accessible_resources` yok mu?

**background.js:**
- [ ] Service worker'da in-memory state'e guvenilmis mi? (storage fallback var mi?)
- [ ] `chrome.scripting.executeScript` ile enjekte edilen fonksiyonlar self-contained mi?
- [ ] `chrome.runtime.onMessage` handler input validasyonu yapiyor mu?
- [ ] DNR dinamik kural ID'si collision-free mi? (allowId hash araligi)
- [ ] Event listener'lar top-level'da mi kaydediliyor? (SW baslangicinda)

**config.js:**
- [ ] Yeni `MSG` tipi eklenmis mi? Dokumante edilmis mi?
- [ ] Yeni storage `KEY` eklenmis mi? `local` mi `session` mi?
- [ ] `BOUNCE_DOMAINS` veya `TRACKING_PARAMS` guncellenmis mi?

**utils.js:**
- [ ] `merge()` fonksiyonu `__proto__`, `constructor`, `prototype` anahtarlarini reddediyor mu?
- [ ] Yeni fonksiyon pure function mu? (yan etkisiz)

**Content Script'ler (cosmetic.js, bounce.js):**
- [ ] `"use strict"` var mi?
- [ ] IIFE formatinda mi? (function wrapper)
- [ ] ESM `import`/`export` KULLANILMAMIS mi? (calismaz!)
- [ ] `document.documentElement` null kontrolu var mi? (document_start)

**Popup/Options:**
- [ ] `chrome.runtime.sendMessage` dogru mesaj tipiyle mi cagriliyor?
- [ ] Response hata kontrolu yapiyor mu? (`if (resp.error)`)
- [ ] UI durumlari (yukleniyor, hata, bos) handle ediliyor mu?

**DNR Rules (rules/*.json):**
- [ ] Her kuralin `id`'si unique mi?
- [ ] `priority` degeri dogru mu? (default: 1)
- [ ] `condition` alani gecerli DNR formati mi?
- [ ] `action.type` dogru mu? (block, allow, redirect, modifyHeaders)

**Cikti:** Her dosya icin notlar

---

## Adim 3: Guvenlik ve MV3 Uyumluluk Kontrolu

**Amac:** openShield'in guvenlik ve MV3 prensiplerine uygunlugu degerlendirmek.

### 3.1. MV3 Guvenlik Kontrol Listesi

**Service Worker State Guvenligi:**
- [ ] In-memory Map/Set/degiskenler storage'a yedekleniyor mu?
- [ ] `logCache` storage.session fallback'i var mi?
- [ ] `tabCounters` storage.session'a yaziliyor mu?
- [ ] SW teardown sonrasi state dogru geri yukleniyor mu?

**DNR Kural Guvenligi:**
- [ ] Dinamik kural ID'si hash-based ve deterministik mi? (`allowId()`)
- [ ] ID araligi dogru mu? (100000-149999 toggle, 150000-199999 allowlist)
- [ ] Aynı ID'li kural eklenmeden once `removeRuleIds` cagriliyor mu?
- [ ] `updateDynamicRules` hata durumu handle ediliyor mu?

**Input Validasyonu:**
- [ ] Tum `chrome.runtime.onMessage` handler'lari input validasyonu yapiyor mu?
- [ ] `isValidHostname(h)` kullaniliyor mu?
- [ ] `isValidDestination(dest)` URL kontrolu yapiyor mu?
- [ ] `ALLOWED_SITE_KEYS` / `ALLOWED_GLOBAL_KEYS` Set kontrolu var mi?

**Prototype Pollution Korumasi:**
- [ ] `merge()` fonksiyonu `__proto__`, `constructor`, `prototype` anahtarlarini reddediyor mu?
- [ ] Kullanici girdisinden objeye direkt atama var mi?

**Permission Least-Privilege:**
- [ ] `manifest.json` permission'lari minimum mu?
- [ ] Gereksiz `host_permissions` eklenmis mi?
- [ ] `declarativeNetRequestFeedback` sadece `onRuleMatchedDebug` icin mi?

**Injection Guvenligi:**
- [ ] MAIN-world enjeksiyonlari self-contained mi?
- [ ] Module scope referansi (import edilen degisken) icermiyor mu?
- [ ] `injectImmediately: true` kullanimi uygun mu?

### 3.2. Genel Guvenlik Kontrolleri
- [ ] API anahtari, sifre, secret kodda gorunuyor mu?
- [ ] `eval()`, `new Function()` kullanimi var mi?
- [ ] `innerHTML` kullanici verisiyle cagriliyor mu?
- [ ] Harici URL'e istek yapiliyor mu? (calisma aninda)
- [ ] Telemetri/loglama kullanici verisi sizdiriyor mu?

**Cikti:** Guvenlik ve MV3 uyumluluk bulgulari

---

## Adim 4: Test Incelemesi

**Amac:** Testlerin yeterli ve dogru oldugunu dogrulamak.

### 4.1. Test Varligi
- [ ] Yeni kod icin test yazilmis mi? (`tests/unit/`)
- [ ] `node --test tests/unit/**/*.test.js` geciyor mu?
- [ ] Build `node tools/build.js` basarili mi?

### 4.2. MV3 Ozgu Test Kontrolleri
- [ ] Service worker state mock'u dogru yapilmis mi? (`chrome.storage` mock)
- [ ] DNR kural validasyonu test edilmis mi?
- [ ] Message handler input validasyonu test edilmis mi? (gecersiz mesaj)
- [ ] `merge()` prototype pollution testi var mi?
- [ ] `isValidHostname` edge case'leri test edilmis mi?

### 4.3. Test Guvenilirligi
- [ ] `node --test` ile calistiginda deterministik mi?
- [ ] Async test'ler dogru handle edilmis mi?
- [ ] Testler bagimsiz mi?

**Cikti:** Test degerlendirmesi

---

## Adim 5: Geri Bildirim Olusturma

**Amac:** Yapici, aciklayici ve eyleme donusturulebilir geri bildirim yazmak.

### 5.1. Yorum Kategorileri

| Prefix | Anlami | Ornek (openShield) |
|--------|--------|-------------------|
| 🔴 **BLOCKER** | Merge edilemez | Service worker'da in-memory state'e guvenilmis, storage fallback yok |
| 🟠 **HIGH** | Ciddi sorun | MAIN-world injection modul import'u iceriyor (serialization calismaz) |
| 🟡 **MEDIUM** | Iyilestirme | DNR kurali regexFilter yerine urlFilter kullanilabilir |
| 🟢 **LOW** | Nitpick | JSDoc eksik, degisken ismi net degil |
| 💡 **SUGGESTION** | Alternatif | Bu fonksiyon utils.js'e tasinabilir (ESM import zincirine uygunsa) |
| ❓ **QUESTION** | Anlamak icin | Bu permission neden eklendi? Gerekcesi nedir? |

### 5.2. Iyi Yorum Ornegi
```
🟠 [HIGH] Service worker teardown'da veri kaybi riski

`tabCounter` Map'i sadece in-memory kullanilmis. Service worker
30 saniye idle sonrasi sonlandirildiginda tum counter'lar sifirlanir.

Oneri: Storage.session'a fallback ekle (mevcut pushLog() pattern'ini takip et):
  - Yazma: storage.session.set({ [SESSION.COUNTERS]: all })
  - Okuma: storage.session.get(SESSION.COUNTERS) ile fallback

Referans: src/background.js:212-225 (counters() ornegi)
```

### 5.3. Genel PR Yorumu (Summary)
```markdown
## Kod Inceleme Ozeti

### MV3 Uyumluluk
- [x] Service worker state guvenligi
- [x] DNR kural ID collision kontrolu
- [x] Permission least-privilege
- [x] Prototype pollution korumasi

### Bulgular
| Seviye | Sayi | Detay |
|--------|------|-------|
| BLOCKER | 0 | - |
| HIGH | 1 | In-memory state fallback eksik |
| MEDIUM | 2 | JSDoc eksik, DNR priority |
| LOW | 1 | Degisken ismi |

### Durum
- [ ] Approve
- [x] Request Changes
- [ ] Comment
```

**Cikti:** Tamamlanmis kod inceleme raporu

---

## Adim 6: Memory Bank Guncellemesi

**Amac:** Tekrarlayan sorunlari izlemek.

### 6.1. Pattern Tespiti
- [ ] Bu PR'daki sorunlar `.kilo/memory-bank/history.md`'de benzer kayit var mi?
- [ ] Tekrar eden MV3 anti-pattern'i var mi? (ornegin: in-memory state'e guvenme)

### 6.2. Coding Standards Guncellemesi
- [ ] Yeni bir anti-pattern tespit edildiyse `.kilo/rules/coding-standards.md`'e ekle

**Cikti:** Memory bank guncellendi

---

## Hizli Referans: openShield Review Checklist

```
MV3 SERVICE WORKER:
- [ ] In-memory state'e storage fallback var mi?
- [ ] executeScript injection'lar self-contained mi?
- [ ] Event listener'lar top-level'da kayitli mi?

DNR KURALLARI:
- [ ] Statik kural ID'leri unique mi?
- [ ] Dinamik kural ID araligi dogru mu? (100K-149K / 150K-199K)
- [ ] removeRuleIds cagrisi addRules'ten once mi?

INPUT VALIDASYONU:
- [ ] onMessage handler'lari input validate ediyor mu?
- [ ] isValidHostname / isValidDestination kullaniliyor mu?
- [ ] ALLOWED_*_KEYS Set kontrolu var mi?

GUVENLIK:
- [ ] Prototype pollution korumasi (merge __proto__ kontrolu)
- [ ] Secret/key kodda gorunuyor mu?
- [ ] eval() / innerHTML kullanici verisiyle kullanilmis mi?

CONTENT SCRIPT:
- [ ] IIFE formatinda mi? "use strict" var mi?
- [ ] ESM import YOK mu? (calismaz!)

MANIFEST:
- [ ] Permission least-privilege mi?
- [ ] ruleset id'leri unique mi?
- [ ] content_scripts world: "ISOLATED" mi?

TEST:
- [ ] node --test tests/unit/**/*.test.js geciyor mu?
- [ ] node tools/build.js basarili mi?
```
