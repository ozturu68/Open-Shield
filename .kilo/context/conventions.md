---
last_updated: 2026-04-26
version: 2.0.0
enforce: true
---

# Conventions — openShield Proje Konvansiyonlari

## Bu Dosyanin Amaci

Bu dosya, openShield projesine ozgu **konvansiyonlari, kaliplari (patterns) ve gelistirici ekibinin kabul ettigi tutarli uygulamalari** icerir. AI kod uretirken "openShield'de bu nasil yapilir?" sorusuna buradan cevap bulur.

**Ne Zaman Guncellenir:** Yeni bir konvansiyon benimsendiginde.

---

## 1. Git ve Versiyon Kontrolu Konvansiyonlari

### 1.1. Branch Stratejisi
```
main        → Production kodu (sadece merge, dogrudan push yok)
  │
  +-- feature/[ozellik]       → Ozellik branch'leri
  +-- fix/[hata]              → Hata duzeltme branch'leri
  +-- refactor/[aciklama]     → Refactoring branch'leri
  +-- chore/[aciklama]        → Altyapi/tools branch'leri
```

### 1.2. Commit Mesaji Konvansiyonu (Conventional Commits)

```
<type>(<scope>): <subject>
```

**openShield Scope'lari:**

| Scope | Kullanim | Ornek |
|-------|----------|-------|
| `dnr` | DNR kural degisikligi | `feat(dnr): yeni tracker domain'leri ekle` |
| `background` | Service worker degisikligi | `fix(background): service worker teardown state hatasi` |
| `cosmetic` | Kozmetik filtreleme | `refactor(cosmetic): MutationObserver optimizasyonu` |
| `bounce` | Bounce detection | `feat(bounce): yeni bounce domain'leri ekle` |
| `popup` | Popup UI | `feat(popup): site bazli sayaç goster` |
| `options` | Options sayfasi | `fix(options): allowlist kaydetme hatasi` |
| `manifest` | Manifest degisikligi | `chore(manifest): yeni permission ekle` |
| `config` | config.js sabitleri | `feat(config): yeni MSG tipi ekle` |
| `utils` | utils.js yardimcilari | `refactor(utils): merge fonksiyonunu optimize et` |
| `tools` | Build araclari | `build(tools): filter list fetch script guncelle` |
| `test` | Test degisikligi | `test(utils): merge testlerini ekle` |
| `docs` | Dokumantasyon | `docs(memory): architecture.md guncelle` |

### 1.3. Commit Ornegi
```
feat(background): auto-shred ozelligi ekle

Sekme kapaninca ilgili origin'in tarayici verisini
(chrome.browsingData.remove) otomatik temizleyen auto-shred
ozelligi eklendi. shred ayari global settings'ten kontrol edilir.

Test: node --test tests/unit/**/*.test.js basarili
Build: node tools/build.js basarili
```

### 1.4. Pull Request Sablonu
```markdown
## Ozet
[Kisa aciklama]

## Degisiklikler
- [Ana degisiklik 1]
- [Ana degisiklik 2]

## MV3 Kontrolleri
- [ ] Service worker state guvenligi (storage fallback)
- [ ] DNR kural ID collision kontrolu
- [ ] Permission least-privilege
- [ ] Content script IIFE formati korunuyor
- [ ] MAIN-world injection self-contained

## Test
- [ ] node --test tests/unit/**/*.test.js geciyor
- [ ] node tools/build.js basarili
- [ ] Manuel test: uzanti yuklendi, popup calisiyor
```

---

## 2. Kod Organizasyonu Konvansiyonlari

### 2.1. Modul Sistemi Kurallari

| Dosya/Konum | Modul Sistemi | Import Yapabilir | Import Edilebilir |
|-------------|--------------|-----------------|------------------|
| `src/background.js` | ESM | config.js, utils.js | — |
| `src/config.js` | ESM | — | background.js |
| `src/utils.js` | ESM | — | background.js |
| `src/cosmetic.js` | IIFE | **YOK** | **YOK** |
| `src/bounce.js` | IIFE | **YOK** | **YOK** |
| `popup/popup.js` | IIFE (inline) | **YOK** | **YOK** |
| `options/options.js` | IIFE (inline) | **YOK** | **YOK** |
| MAIN-world injection | Self-contained | **KESINLIKLE YOK** | **YOK** |

### 2.2. Import Sirasi (ESM Dosyalari Icin)
```javascript
// src/background.js
import { DEFAULT_SETTINGS, KEY, SESSION, MSG, BOUNCE_DOMAINS } from "./config.js";
import { hostname, isBrowser, normHost, seed, merge } from "./utils.js";
```

### 2.3. File Co-location
```
// openShield'de duz yapi tercih edilir (modul basina dizin yok)
src/
├── background.js    // Tek dosya, 400+ satir oldugunda bolunebilir
├── config.js        // Sabitler tek dosyada
└── utils.js         // Yardimcilar tek dosyada

// UI dosyalari kendi dizinlerinde
popup/
├── popup.html
├── popup.js
└── popup.css

// Testler merkezi
tests/unit/
├── config.test.js
├── utils.test.js
├── farbling.test.js
└── params.test.js
```

---

## 3. API ve Mesajlasma Konvansiyonlari

### 3.1. Mesaj Tipleri (MSG sabitleri — config.js)

| Mesaj Tipi | Yon | Amac | Request | Response |
|-----------|-----|------|---------|----------|
| `GET_STATE` | UI → SW | Site durumunu al | `{ type, tabId }` | `{ h, cfg, counts }` |
| `SET_SITE` | UI → SW | Per-site ayar degistir | `{ type, h, k, v }` | `{ ok: true }` veya `{ error }` |
| `SET_GLOBAL` | UI → SW | Global ayar degistir | `{ type, k, v }` | `{ ok: true }` veya `{ error }` |
| `GET_LOG` | UI → SW | Block log detayi | `{ type, tabId }` | `{ log: [...] }` |
| `BOUNCE` | Content → SW | Bounce link bildir | `{ type, dest }` | `{ ok: true }` |

### 3.2. Response Formati
```javascript
// Basarili
{ ok: true }
{ h: "example.com", cfg: {...}, counts: { blocked: 5, upgraded: 2, bounces: 0 } }
{ log: [...] }

// Hata
{ error: "invalid parameters" }
{ error: "invalid tabId" }
{ error: "invalid key" }
{ error: "unknown" }
```

### 3.3. Storage Key Konvansiyonu
- `chrome.storage.local`: Kalici ayarlar → `KEY.GLOBAL`, `KEY.SITES`, `KEY.META`, `KEY.ALLOW`, `KEY.BLOCK`
- `chrome.storage.session`: Oturum verisi → `SESSION.COUNTERS`, `SESSION.SEEDS`, `SESSION.LOG`, `SESSION.ORIGINS`
- In-memory Map'ler (cache): her zaman storage'a yaz ve oku (fallback pattern)

---

## 4. Hata Yonetimi Konvansiyonlari

### 4.1. Input Validasyonu

Tum `chrome.runtime.onMessage` handler'larinda input validasyonu:

```javascript
// Hostname kontrolu
function isValidHostname(h) {
  return typeof h === "string" && h.length > 0 && h.length < 256
    && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(h);
}

// URL/domain kontrolu
function isValidDestination(dest) {
  if (typeof dest !== "string" || dest.length > 4096) return false;
  try {
    const u = new URL(dest);
    return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.length > 0;
  } catch { return false; }
}

// Izinli anahtar kontrolu
const ALLOWED_SITE_KEYS = new Set(["shields", "ads", "fp", "https", "cookies", "bounce", "params", "cosmetic", "shred"]);
const ALLOWED_GLOBAL_KEYS = new Set(["ads", "fp", "https", "cookies", "bounce", "params", "cosmetic", "shred"]);
```

### 4.2. Error Handling Deseni
```javascript
// Try-catch + URL constructor pattern'i
try {
  const u = new URL(d.url);
  // ... islem
} catch { /* URL gecersiz, sessizce gec */ }

// Hata durumunda reply
if (!isValidHostname(msg.h)) { reply({ error: "invalid parameters" }); return; }

// Async handler'da return true (senkron reply icin zorunlu)
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => { /* ... */ })();
  return true; // ← async reply icin ZORUNLU
});
```

---

## 5. DNR Konvansiyonlari

### 5.1. Rule ID Araliklari
```
Statik kurallar:    1+ (her ruleset kendi icinde artan, manifest-declared)
Dinamik toggle:     100000–149999 (hostname hash tabanli: ALLOW_BASE + hash % 50000)
Dinamik allowlist:  150000–199999 (options sayfasindan eklenen)
```

### 5.2. DNR Priority Stratejisi
- Tum statik kurallar: `priority: 1` (default)
- Dinamik allow kurallari: `priority: 999` (block'tan yuksek, Chrome allow > block)
- CSS kurallari (params, headers): `priority: 1`

### 5.3. Ruleset Yonetimi
- Yeni statik ruleset: `rules/yeni.json` olustur, `manifest.json` `rule_resources`'a ekle
- Dinamik kural: `chrome.declarativeNetRequest.updateDynamicRules` ile
- Ruleset enable/disable: `chrome.declarativeNetRequest.updateEnabledRulesets`

---

## 6. Dokumantasyon Konvansiyonlari

### 6.1. JSDoc (Zorunlu)
```javascript
/**
 * Extracts and normalizes the hostname from a URL.
 * @param {string} url
 * @returns {string} Lowercase hostname without 'www.' prefix
 */
export function normHost(url) { ... }
```

### 6.2. JSDoc Tum Export Edilen Fonksiyonlara Eklenir
- `@param` ve `@returns` etiketleri zorunlu
- `@type` kompleks tipler icin
- `@throws` hata firlatan fonksiyonlar icin

---

## 7. AI ile Calisma Konvansiyonlari

### 7.1. AI Kod Uretimi Kurallari
- AI kodu onerir, insan onaylar
- AI her zaman MV3 kisitlarini goz onunde bulundurur
- AI yeni npm paketi onermez (sifir bagimlilik)
- AI kod uretmeden once memory-bank ve context dosyalarini okur

### 7.2. AI Commit Etiketi (Opsiyonel)
```
feat(background): auto-shred ozelligi ekle

[AI-COAUTHOR]
- Implemented auto-shred logic in background.js
- Human review: storage key check, permission verified
```

---

## 8. Anti-Pattern'ler (openShield'de Yapilmayacaklar)

- ❌ Service worker'da in-memory state'e guvenme (storage fallback zorunlu)
- ❌ Content script'te ESM `import` kullanma (calismaz)
- ❌ MAIN-world injection'da modul degiskenine referans (serialization calismaz)
- ❌ DNR kural ID'sini collision yaratacak sekilde secme
- ❌ `manifest.json`'a gerekcesiz permission ekleme
- ❌ HTML'de inline script/style kullanma (MV3 CSP ihlali)
- ❌ `eval()` / `new Function()` kullanma (guvenlik + CSP)
- ❌ Harici URL'e calisma aninda istek yapma
- ❌ npm paketi ekleme (runtime) — sifir bagimlilik prensibi
- ❌ `console.log` production kodda birakma
- ❌ `localStorage` kullanma (service worker'da yok, chrome.storage kullan)
- ❌ TypeScript dosyasi olusturma (proje tercihi: vanilla JS)

---

**Son Guncelleme:** 2026-04-26
**Sonraki Review:** Her ay
**Sahibi:** openShield Gelistirici
