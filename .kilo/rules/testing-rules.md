---
last_updated: 2026-04-26
version: 1.0.0
enforce: true
review_cycle: monthly
coverage_target: 70
---

# Testing Rules — openShield Test Standartlari

## Bu Dosyanin Amaci

Bu dosya, openShield projesindeki test standartlarini tanimlar. openShield **Node.js built-in test runner** (`node:test`) kullanir. Harici test framework'u yoktur. Testler `tests/unit/` dizininde, `*.test.js` pattern'i ile bulunur.

---

## 1. Test Altyapisi

### 1.1. Calistirma

```bash
# Tum unit testler
node --test tests/unit/**/*.test.js

# Belirli bir test dosyasi
node --test tests/unit/utils.test.js
```

### 1.2. Test Dosyasi Yapisi

```
tests/
└── unit/
    ├── config.test.js      # config.js sabitleri ve yapisi
    ├── utils.test.js       # utils.js saf fonksiyonlari
    ├── farbling.test.js    # PRNG algoritmasi testi
    └── params.test.js      # DNR parametre regex testi
```

### 1.3. Import

ESM moduller (`config.js`, `utils.js`) test edilirken `import()` kullanilir:

```javascript
const { hostname, isBrowser, normHost, seed, rand, merge } = await import('../src/utils.js')
```

---

## 2. Ne Test Edilmeli?

### Mutlaka Test Edilmeli

- **Saf fonksiyonlar** (`utils.js`): `hostname()`, `isBrowser()`, `normHost()`, `seed()`, `rand()`, `merge()`
- **Sabitler** (`config.js`): `DEFAULT_SETTINGS` yapisi, `KEY`/`SESSION`/`MSG` varligi
- **PRNG algoritmasi:** Deterministik, farkli seed'ler farkli sonuc, [0,1) araligi
- **Prototype pollution korumasi:** `merge()` `__proto__` engelleme
- **DNR Regex:** `params.json` regex'lerinin ornek URL'lerde dogru calismasi
- **Validasyon fonksiyonlari:** `isValidHostname()`, `isValidDestination()`

### Su An Test Edilmesi Zor

- `background.js` service worker mantigi (Chrome API mock gerektirir)
- Content script'ler (DOM baglami gerektirir)
- DNR kural eslesmesi (Chrome DNR engine gerektirir)
- UI (popup, options) davranisi (DOM + Chrome API mock gerektirir)

---

## 3. Test Yazim Standartlari

### 3.1. Test Yapisi (node:test)

```javascript
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('utils.hostname', () => {
  it('should extract hostname from full URL', () => {
    const result = hostname('https://example.com/path?q=1')
    assert.strictEqual(result, 'example.com')
  })

  it('should return empty string for invalid URL', () => {
    assert.strictEqual(hostname('not-a-url'), '')
  })
})
```

### 3.2. Isimlendirme

- `describe('module.functionName', ...)` — modul ve fonksiyon adi
- `it('should <behavior> when <condition>', ...)` — BDD tarzi

### 3.3. Test Organizasyonu

- Her modul/test dosyasi bir `describe` ile baslar
- Her fonksiyon bir nested `describe`
- Her senaryo bir `it`
- Normal case, edge case, error case sirasiyla

---

## 4. Mevcut Testler ve Coverage

### 4.1. config.test.js (38 satir)

Test edilenler:
- `DEFAULT_SETTINGS` tum beklenen anahtarlari iceriyor mu (ads, fp, https, cookies, bounce, params, cosmetic, shred)?
- `KEY` ve `SESSION` string mi?
- `BOUNCE_DOMAINS` bos olmayan array mi?
- `TRACKING_PARAMS` bilinen parametreleri iceriyor mu (utm_source, fbclid, gclid)?

### 4.2. utils.test.js (54 satir)

Test edilenler:
- `hostname()` — dogru URL, gecersiz URL, bos string
- `isBrowser()` — chrome://, edge://, brave://, null, bos
- `normHost()` — www.strip, lowercase
- `seed()` — 32 karakter hex
- `rand()` — deterministik, [0,1) araligi
- `merge()` — deep merge, prototype pollution korumasi

### 4.3. farbling.test.js (35 satir)

Test edilenler:
- PRNG deterministik — ayni seed ayni sonuc
- Farkli seed farkli sonuc
- Canvas bit mutasyonu base64 formatinda

### 4.4. params.test.js (83 satir)

Test edilenler:
- DNR ruleset JSON yapisi ve zorunlu alanlar
- `regexFilter` + `regexSubstitution` ornek URL'lerde dogru calisiyor mu
- Parametre temizleme: utm_source, utm_medium, fbclid, gclid
- Non-tracking parametreler korunuyor mu

### 4.5. Coverage Hedefleri

| Metrik | Hedef | Mevcut |
|--------|-------|--------|
| Fonksiyon coverage | %70+ | ~%60 (utils.js yuksek, background.js test edilmiyor) |
| Kritik fonksiyon coverage | %100 | utils.js, config.js, merge() |

---

## 5. Test Anti-Pattern'leri

| Anti-Pattern | Aciklama | Dogrusu |
|-------------|----------|---------|
| Test edilemez kod yazmak | Global state, yan etki | Saf fonksiyon, DI |
| Mock ihtiyaci olan test yazmamak | "Zor" diye atlamak | Basit mock, stub |
| Sadece happy path test | Edge case'ler kritik | hata durumlari da test et |
| Birbirine bagimli testler | Test sirasi onemli olmamali | Her test bagimsiz |
| Chrome API dogrudan cagirmak | Unit test'te yapilmaz | Mock veya integration test |

---

## 6. Build Entegrasyonu

```bash
# Build adimi testleri otomatik calistirir
node tools/build.js
# -> validateManifest()
# -> validateRules()
# -> runTests()  // node --test tests/unit/**/*.test.js
# -> createZip()
```

Build basarili olmasi icin tum testler gecmeli.

---

**Son Guncelleme:** 2026-04-26
**Sonraki Review:** Her ay
**Sahibi:** openShield Gelistirici
