---
last_updated: 2026-04-26
version: 1.0.0
enforce: true
review_cycle: monthly
severity: critical
---

# Security Rules — openShield Guvenlik Kurallari

## Bu Dosyanin Amaci

Bu dosya, openShield'in **guvenlik standartlarini ve zorunlu kurallarini** tanimlar. openShield bir gizlilik uzantisi oldugu icin guvenlik en onemli onceliktir. Bu kurallar "tercih" degil, "zorunluluk" tur.

---

## 1. Gizlilik ve Veri Guvenligi

### 1.1. Sifir Telemetri (Zorunlu)

- **Hicbir kullanici verisi disariya gonderilmez.**
- Analytics, crash reporting, usage tracking YOK.
- `chrome.runtime.sendMessage` sadece extension icinde.
- Harici `fetch()`/`XMLHttpRequest` calisma aninda yok.
- Build araclari (`fetch-lists.js`) sadece gelistirme asamasinda.

### 1.2. Veri Saklama

| Kural | Aciklama |
|-------|----------|
| Tum veri yerel | `chrome.storage.local` + `chrome.storage.session` |
| Sync yok | `chrome.storage.sync` kullanilmiyor |
| Hassas veri yok | Sifre, token, PII saklanmaz |
| Block log | Max 80 kayit, oturum sonunda silinir |
| Auto Shred | Sekme kapaninca site verisi temizlenir (`browsingData`) |

---

## 2. Input Validasyonu (Zorunlu)

### 2.1. Mesaj Handler Validasyonu

Tum `chrome.runtime.onMessage` handler'lari input valide etmeli:

```javascript
// Hostname validasyonu
function isValidHostname(h) {
  return typeof h === 'string' && h.length > 0 && h.length < 256 &&
    /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(h)
}

// Destination validasyonu (bounce)
function isValidDestination(dest) {
  try {
    const url = new URL(dest)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch { return false }
}
```

### 2.2. URL Islemleri

- `hostname()` fonksiyonu `try/catch` ile korunmali.
- `new URL()` kullan, string manipülasyonu yapma.
- `decodeURIComponent()` hata firlatabilir — try/catch.

---

## 3. Kod Enjeksiyon Guvenligi

### 3.1. MAIN-world Injection

- `installFarbling`, `installWebRTCBlock`, `installBeaconBlock` **self-contained** olmali.
- Modul scope'una referans iceremez (serialize edilemez).
- Sayfa JS'ine minimum mudahale — sadece gerekli API'ler wrap edilir.
- `toString()` deception ile native gibi gorunmeli.

### 3.2. Content Script Guvenligi

- ISOLATED dunyada calisir — sayfa JS'ine erisemez (ve tersi).
- DOM manipülasyonu sadece CSS injection (inline style).
- `innerHTML` kullanilmaz.

### 3.3. DNR Kural Guvenligi

- `regexFilter` kullanirken ReDoS (regex DoS) riskine dikkat.
- `urlFilter` pattern'leri dogru domain anchor (`||`) kullanmali.
- `regexSubstitution` guvenli olmali — sadece parametre temizleme.

---

## 4. Prototype Pollution Korumasi

`merge()` fonksiyonunda:

```javascript
// Korumali deep merge
export function merge(base, over) {
  const out = { ...base }
  for (const k of Object.keys(over)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue
    if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k])) {
      out[k] = merge(base[k] || {}, over[k])
    } else {
      out[k] = over[k]
    }
  }
  return out
}
```

**YASAK:** `__proto__`, `constructor`, `prototype` key'lerini iceren objeler.

---

## 5. Storage Guvenligi

### 5.1. Storage Key Yonetimi

- Tum storage key'leri `config.js`'te SCREAMING_SNAKE_CASE ile tanimli.
- Dinamik key uretimi yok — hepsi sabit.
- `chrome.storage.local` quota: 10 MB (varsayilan). Asilmamali.

### 5.2. Storage Veri Yapisi

```javascript
// storage.local
{
  GLOBAL: { ads: 'standard', fp: true, ... },
  SITES: { 'example.com': { shields: false, ads: 'off' } },
  ALLOW: ['trusted-site.com', ...],
  BLOCK: ['bad-site.com', ...],
  META: { list_updated: 1234567890 },
}

// storage.session
{
  COUNTERS: { '42': { ads: 5, fp: 0, tracker: 3 } },
  SEEDS: { 'example.com': 'a1b2c3...' },
  LOG: { '42': [{url: '...', type: 'ads', ...}] },
  ORIGINS: { '42': 'example.com' },
}
```

---

## 6. DNR Kural Guvenligi

### 6.1. ID Collision Onleme

- Dinamik kural ID'leri eklenmeden once `getDynamicRules` ile mevcut ID'ler kontrol edilmeli.
- Ayni ID ile kural eklemek hata firlatabilir.

### 6.2. Kural Sayisi Limiti

- Dinamik: max 5000. `updateDynamicRules` once `removeRuleIds` ile temizle.
- Statik: max 30000 toplam. `node tools/build.js` build sirasinda kontrol eder.

---

## 7. Permission Guvenligi

### 7.1. Least Privilege

- `browsingData` — auto shred icin gerekli, ancak guclu bir permission.
- `<all_urls>` — DNR'in tum sitelerde calismasi icin gerekli. Host permissions daraltilamaz.
- Gereksiz permission eklenmez.

### 7.2. Manifest Guvenligi

- `content_security_policy` extension icin varsayilan MV3 CSP yeterli.
- `externally_connectable` tanimlanmamis (disaridan message kabul edilmez).
- `web_accessible_resources` yok (content script'ler disariya kaynak acmaz).

---

## 8. Anti-Pattern'ler

| Anti-Pattern | Risk | Dogrusu |
|-------------|------|---------|
| Telemetri eklemek | Kullanici guveni kaybi, CWS reddi | Sifir telemetri |
| `eval()` / `new Function()` | Code injection | Kullanma |
| `innerHTML` | XSS | `textContent`, DOM API |
| Prototype pollution acigi | Data corruption | `merge()` korumasi |
| DNR ID collision | Kural calismaz | Hash-based + range check |
| Hassas veri loglama | PII sizintisi | Sadece URL/Rule ID logla |
| `http://` fetch | MITM riski | HTTPS only (DNR upgrade) |
| Storage'a guvenmeden in-memory | Service worker teardown | Write-through cache |

---

**Son Guncelleme:** 2026-04-26
**Sonraki Review:** Her ay
**Sahibi:** openShield Gelistirici
