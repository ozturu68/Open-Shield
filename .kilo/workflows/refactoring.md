# Workflow: Refactoring (Kod Iyilestirme)

## Bu Workflow Ne Ise Yarar?

Bu workflow, mevcut kodun iyilestirilmesi surecini tanimlar. openShield'e ozgu refactoring turleri: MAIN-world injection fonksiyonlarini self-contained yapma, shared kodu utils.js'e tasima (content script ESM limitasyonu ile), DNR kural optimizasyonu, service worker state yonetimi iyilestirme.

**Ne Zaman Kullanilir:** Kullanici "su kodu refactor et", "kodu temizle", "background.js cok uzamis", "DNR kurallarini optimize et", "service worker state yonetimini duzelt" dediginde.

**Kac Adim:** 7 ana adim
**Tahmini Sure:** Refactoring kapsamina gore degisir

---

## On Kosullar (Baslamadan Once)

AI su dosyalari okumali:
1. `.kilo/memory-bank/architecture.md` — Mimari kararlar, DNR stratejisi
2. `.kilo/rules/coding-standards.md` — Stil ve yapi kurallari
3. `.kilo/rules/architecture-rules.md` — MV3 katman kurallari
4. `src/config.js` + `src/utils.js` — Shared kod, tasima hedefleri

---

## Adim 1: Refactoring Amacini Belirleme

**Amac:** Neden refactoring yapiliyor?

### 1.1. openShield Refactoring Turleri

| Tur | Neden | Ornek |
|-----|-------|-------|
| **Self-contained extraction** | MAIN-world injection guvenligi | `background.js`'teki inline fonksiyonu ayri self-contained fonksiyona cikar |
| **Shared code tasima** | Kod tekrarini azaltma | `popup.js` ve `options.js`'teki ortak kodu `utils.js`'e tasi (UI ESM import edemezse duplike kalabilir) |
| **DNR kural optimizasyonu** | Kural verimliligi | Regex kurali `urlFilter`'a cevir, priority stratejisi |
| **Service worker state** | Teardown dayanikliligi | In-memory Map'lere storage fallback ekle |
| **Content script performans** | Sayfa yukleme hizi | MutationObserver batching, selector optimizasyonu |
| **Kod organizasyonu** | Okunabilirlik | Uzun fonksiyonlari bol, event handler'lari grupla |

### 1.2. Hedef Metrikleri Belirle
- [ ] Refactoring'den once: dosya satir sayisi, fonksiyon sayisi
- [ ] Hedef: `background.js` < 500 satir, fonksiyon < 40 satir
- [ ] Basari kriteri: `node --test tests/unit/**/*.test.js` geciyor, davranis degismemis

**Cikti:** Refactoring amaci ve basari kriterleri

---

## Adim 2: Etki Analizi (Impact Analysis)

**Amac:** Degisikligin MV3 bilesenleri uzerindeki etkisini degerlendirmek.

### 2.1. MV3 Bagimlilik Haritasi

```
Refactoring Hedefi: src/background.js → installFarbling() extract

Bagimli Bilesenler:
- chrome.scripting.executeScript → MAIN-world injection (self-contained olmali)
- chrome.webNavigation.onCommitted → injectAll() cagrisi
- storage.session → PRNG seed okumasi

UYARI: installFarbling executeScript ile serialize edilir.
Modul scope'undan (config.js, utils.js) import ICEREMEZ.
```

### 2.2. Etki Degerlendirmesi

| Refactoring Turu | Etki | Risk |
|-----------------|------|------|
| background.js → utils.js tasima | ESM import zinciri korunmali | Dusuk |
| background.js → content script tasima | MUMKUN DEGIL (content script ESM import yapamaz) | — |
| MAIN-world fonksiyonu extract | Self-contained olmali, import yok | Yuksek |
| DNR kural degisikligi | `node tools/build.js` validasyonu zorunlu | Orta |
| Manifest degisikligi | Chrome Web Store incelemesi tetiklenebilir | Dusuk (dev) |

### 2.3. Content Script Limitasyonu Hatirlatmasi

> **Kritik:** Manifest ile deklare edilen content script'ler (`cosmetic.js`, `bounce.js`) ESM `import`/`export` kullanamaz. Bu dosyalara `utils.js`'ten kod TASINAMAZ. Ortak kod ya duplike kalir ya da `chrome.runtime.sendMessage` ile background'dan alinir.

**Cikti:** Etki analizi raporu

---

## Adim 3: Test Korumasi (Test Safety Net)

**Amac:** Refactoring'den once testlerin calistigindan emin olmak.

### 3.1. Mevcut Test Durumu
- [ ] `node --test tests/unit/**/*.test.js` — Tum testler geciyor mu?
- [ ] Eksik test var mi? (refactoring'den once yaz)
- [ ] `node tools/build.js` — Build basarili mi?

### 3.2. MV3 Ozgu Test Kontrolleri
- [ ] Service worker state testleri: storage.local/session mock
- [ ] `merge()` fonksiyonu prototype pollution korumasi testi
- [ ] `isValidHostname`, `isValidDestination` input validasyon testleri
- [ ] `allowId()` hash collision testi

### 3.3. Golden Master Test (Davranis Koruma)
- [ ] Refactoring oncesi ve sonrasi aynı input → aynı output uretiyor mu?
- [ ] DNR kural degisikliginde aynı URL'ler aynı sekilde eslesiyor mu?

**Cikti:** Testler yesil, refactoring guvenli baslayabilir

---

## Adim 4: Kademeli Implementasyon

**Amac:** Buyuk refactoring'i kucuk, guvenli adimlara bolmek.

### 4.1. MV3 Refactoring Adim Sirasi

```
Adim 1: Hazirlik
  → background.js icinde fonksiyonu kendi scope'una al
  → Degisken isimlerini netlestir, JSDoc ekle
  → In-memory state yerine storage fallback ekle

Adim 2: Tasarim Degisikligi
  → background.js'ten utils.js'e pure fonksiyon tasi (ESM import guncelle)
  → MAIN-world injection fonksiyonunu self-contained yap (import referanslarini kaldir)
  → DNR kural priority/resourceType optimize et

Adim 3: Temizlik
  → Kullanilmayan import'lari kaldir
  → Duplike kodu konsolide et (UI script'lerinde bilincli duplikasyon haric)
  → Gereksiz console.log'lari temizle
```

### 4.2. Her Adimda Yapilacaklar
- [ ] Kucuk commit'ler (her logical adim = 1 commit)
- [ ] Her adimda `node --test tests/unit/**/*.test.js` calistir
- [ ] Her adimda `node tools/build.js` calistir
- [ ] Hata varsa geri al (git stash / git reset)

### 4.3. Commit Sirasi Ornegi
```
refactor(background): extract normalizeHost to utils.js
refactor(background): make installFarbling self-contained
refactor(cosmetic): optimize MutationObserver batching
refactor(dnr): convert regex rules to urlFilter
test(utils): add tests for extracted functions
```

**Cikti:** Refactoring tamamlandi, her adimda testler yesil

---

## Adim 5: Kod Inceleme ve Kalite Kontrol

**Amac:** Yeni kodun openShield standartlarina uygunlugunu dogrulamak.

### 5.1. MV3 Ozgu Inceleme Kontrolleri
- [ ] **Service worker state guvenligi:** In-memory state storage'a fallback yapiyor mu?
- [ ] **Self-contained injection:** MAIN-world fonksiyonlari modul import'u icermiyor mu?
- [ ] **ESM import zinciri:** background.js → config.js → utils.js zinciri dogru mu?
- [ ] **Content script IIFE:** `"use strict"` var mi? ESM import YOK mu?
- [ ] **DNR rule ID:** ID collision riski var mi? ID araligi dogru mu?

### 5.2. Kalite Olcumleri
```
Once:
- background.js: [X] satir
- En uzun fonksiyon: [X] satir
- Duplike kod: [X] yer

Sonra:
- background.js: [Y] satir
- En uzun fonksiyon: [Y] satir
- Duplike kod: [Y] yer
```

**Cikti:** Kalite metrikleri iyilesmisti

---

## Adim 6: Butunlestirme Dogrulamasi

**Amac:** Refactoring'in sistemi bozmadigini garantiye almak.

### 6.1. Test Seviyeleri
- [ ] `node --test tests/unit/**/*.test.js` — Tum unit testler geciyor
- [ ] `node tools/build.js` — Manifest ve DNR validasyonu basarili
- [ ] Manuel: Uzantiyi `chrome://extensions`'a yukle, popup/ac options/test et

### 6.2. MV3 Manuel Dogrulama
- [ ] Service worker console'da hata var mi?
- [ ] DNR `onRuleMatchedDebug` listener'i calisiyor mu?
- [ ] Popup acilip state gosteriyor mu?
- [ ] Content script'ler calisiyor mu? (F12 → Console → ilgili sekme)
- [ ] Farbling uygulaniyor mu? (canvas fingerprint test sitesi)

**Cikti:** Tum testler gecti, sistem kararli

---

## Adim 7: Memory Bank Guncellemesi

**Amac:** Mimari degisiklikleri kaydetmek.

### 7.1. Architecture.md Guncellemesi
```markdown
## [Tarih]: [Refactoring Turu]

- **Neden:** [Neden refactoring yapildi?]
- **Ne:** [Neler degisti?]
- **Desen:** [Yeni desen?]
- **Etki:** [Kac dosya degisti, metrik iyilesmesi]
```

### 7.2. Tech Stack.md Guncellemesi (Eger yeni API kullanildiysa)
- [ ] Yeni chrome.* API kullanimi eklendi mi?

### 7.3. Kullaniciya Teslim
```
Refactoring: [Amac]
Durum: Tamamlandi

Yapilanlar:
- [Ana degisiklikler]

Metrikler:
- Once: [X] → Sonra: [Y]

Test:
- node --test tests/unit/**/*.test.js: [Sonuc]
- node tools/build.js: [Sonuc]

Uyari:
- [Content script duplikasyonu, ESM limitasyonu gibi bilincli kararlar]
```

---

## Hizli Referans: openShield Refactoring Katalogu

### Extract to utils.js (ESM, background.js'ten)
```javascript
// src/utils.js
/**
 * Normalizes a hostname to lowercase, removing 'www.' prefix.
 * @param {string} h
 * @returns {string}
 */
export function normHost(h) {
  const lower = h.toLowerCase().trim();
  return lower.startsWith("www.") ? lower.slice(4) : lower;
}
```

### Self-Contained MAIN-world Injection
```javascript
// background.js — self-contained, NO imports from config.js/utils.js
function installFarbling(seed) {
  if (window.__osFarble) return;
  window.__osFarble = true;
  // ... tum mantik burada, disariya referans YOK
}
```

### DNR Kural Optimizasyonu
```json
// Once (regex, daha yavas)
{ "condition": { "regexFilter": "^https?://.*\\.doubleclick\\.net/.*" } }

// Sonra (urlFilter, daha hizli)
{ "condition": { "urlFilter": "doubleclick.net", "initiatorDomains": ["*"] } }
```

---

## Yasaklar (Refactoring Sirasinda)

- ❌ Refactoring + yeni ozellik ayni branch'de
- ❌ Testleri gecmeyen kodu "sonra duzeltirim" birakma
- ❌ "Bir seferde buyuk patlatma" — kucuk adimlarla ilerle
- ❌ Mevcut davranisi degistirme (refactoring != feature)
- ❌ Content script'e ESM import ekleme (calismaz)
- ❌ MAIN-world injection'a modul referansi ekleme (serialization calismaz)
- ❌ DNR kural ID'sini collision yaratacak sekilde degistirme
