---
last_updated: 2026-04-26
version: 1.0.0
enforce: true
review_cycle: monthly
---

# Coding Standards — openShield Kodlama Standartlari

## Bu Dosyanin Amaci

Bu dosya, openShield projesindeki **tum kodun nasil yazilmasi gerektigini** tanimlar. AI kod uretirken bu kurallara uymak zorundadir. openShield sifir bagimlilikli, ES2022 JavaScript, MV3 tarayici uzantisi olarak gelistirilmektedir.

---

## 1. Genel Prensipler

- **KISS (Keep It Simple, Stupid):** En basit cozum genellikle en iyisidir. Minimal kod, maksimum etki.
- **DRY (Don't Repeat Yourself):** Tekrar eden kod `utils.js`'e extract edilmelidir. Ancak content script'ler ve UI script'leri ESM import yapamadigindan, bazi kucuk fonksiyonlar bilincli olarak duplike olabilir.
- **YAGNI:** Gelecekte lazim olur diye kod yazma.
- **Single Responsibility:** Her fonksiyon, her dosya tek bir sey yapar.
- **Zero-dependency bilinci:** npm paketi ekleme. Sadece Web Extension API'leri.

---

## 2. Isimlendirme Kurallari (Zorunlu)

| Tur | Format | Ornek |
|-----|--------|-------|
| Degisken/Fonksiyon | camelCase | `hostname`, `isValidHostname`, `setShields` |
| Sabitler | SCREAMING_SNAKE_CASE | `DEFAULT_SETTINGS`, `KEY`, `MSG`, `SELECTORS` |
| Event Listener | `handle<Event>` | `handleMessage`, `handleRuleMatched` |
| Dosya | kebab-case.js | `background.js`, `cosmetic.js` |
| Storage Key | SCREAMING_SNAKE_CASE | `COUNTERS`, `SEEDS`, `LOG` |
| DNR Ruleset ID | kebab-case | `easylist`, `easyprivacy`, `https_upgrade` |

---

## 3. JavaScript Standartlari

### 3.1. Syntax
- **Dil Surumu:** ES2022
- **Moduller:** ESM (`import`/`export`) background.js ve modul dosyalari icin. IIFE content script ve UI script'leri icin.
- **`"use strict"`** tum IIFE dosyalarda zorunlu.
- **`async/await`** Promise chain yerine tercih edilir.
- **Arrow function** sadece kisa callback'ler icin. Top-level fonksiyonlar `function` declaration.
- **Semicolon zorunlu.**

### 3.2. Kod Kalite Olcutleri

| Olcu | Hedef |
|------|-------|
| Fonksiyon Uzunlugu | < 40 satir (background.js bazi inline fonksiyonlar istisna) |
| Dosya Uzunlugu | < 500 satir |
| Parameter Sayisi | < 5 |
| Nesting Derinligi | < 3 (guard clause ile azalt) |

### 3.3. JSDoc

Tum export edilen fonksiyonlarda JSDoc zorunlu:

```javascript
/**
 * Extracts and normalizes the hostname from a URL.
 * @param {string} url
 * @returns {string}
 */
export function hostname(url) { ... }
```

---

## 4. Dosya Organizasyonu

Her dosya su sirayla yazilir:
1. Dosya baslik JSDoc
2. Import'lar (ESM dosyalari icin)
3. Sabitler
4. Fonksiyon declaration'lari (top-level)
5. Event listener kayitlari
6. Export'lar (ESM dosyalari icin)

---

## 5. openShield Ozgu Kurallar

### 5.1. Service Worker (`background.js`)

- In-memory state (Map, Set) sadece cache olarak kullan. Her zaman `chrome.storage.session`'a yaz ve oku.
- `chrome.scripting.executeScript` ile enjekte edilen fonksiyonlar **self-contained** olmali. Modul scope'una referans icermemeli.
- Tum `chrome.runtime.onMessage` handler'lari input validasyonu yapmali.

### 5.2. Content Script'ler

- Manifest ile deklare edilen content script'ler IIFE formatinda olmali.
- ESM import yapilamaz — gerekli sabitler dosya icinde duplike edilmeli.
- `run_at: "document_start"` icin `document.documentElement` henuz olusmamis olabilir — `DOMContentLoaded` fallback'i eklenmeli.

### 5.3. DNR Kurallari

- Statik kurallar `rules/*.json` dizininde. Her ruleset `id` ile manifest'te tanimlanmali.
- Dinamik kural ID'leri deterministik fakat collision-free olmali.
- Yeni ruleset eklenince `manifest.json` `rule_resources` guncellenmeli.

### 5.4. HTML Dosyalari

- **Inline script/style yok** (MV3 CSP).
- Tum CSS external dosyada. Tum JS external dosyada.
- `popup.js` ve `options.js` IIFE formatinda (ESM import yapilamaz).

---

## 6. Anti-Pattern'ler (Yasak)

| Anti-Pattern | Aciklama |
|-------------|----------|
| In-memory state'e guvenmek | Service worker teardown state'i kaybeder |
| ESM import content script'te | Manifest content script'ler ESM desteklemez |
| `eval()` / `new Function()` | Guvenlik riski |
| `innerHTML` kullanici verisiyle | XSS riski |
| Blocking DNR kurali ID collision | Ayni ID iki kuralda olmamali |
| MAIN-world injection'da modul referansi | Serialization calismaz |
| HTML'de inline script/style | MV3 CSP ihlali |
| `console.log` production kodda | Kullanici bilgi sizintisi |
| Synchronous `XMLHttpRequest` | Service worker'da calismaz |
| npm paketi eklemek (runtime) | Sifir bagimlilik prensibi |

---

## 7. Commit Mesaj Formati

Conventional Commits:

```
type(scope): aciklama

feat(dnr): yeni tracker domain'leri ekle
fix(background): service worker teardown sonrasi state hatasi
refactor(cosmetic): MutationObserver optimizasyonu
test(config): DEFAULT_SETTINGS testlerini ekle
build(tools): filter list fetch script'ini guncelle
docs(agents): code-reviewer ajan tanimini guncelle
```

---

**Son Guncelleme:** 2026-04-26
**Sonraki Review:** Her ay
**Sahibi:** openShield Gelistirici
