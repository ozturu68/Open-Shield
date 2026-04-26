---
name: storage-design
description: chrome.storage.local ve session API'leri ile veri yonetimi, settings hierarchy, write-through cache ve storage migration desenleri. openShield uzantisi icin optimize edilmistir.
version: 1.0.0
author: AI Entegrasyon Ekibi
last_updated: 2026-04-26
---

# Storage Design Skill — openShield

## Bu Skill Ne Ise Yarar?

`chrome.storage.local` ve `chrome.storage.session` API'lerini kullanarak veri yonetimi, settings hierarchy, write-through cache ve data migration konularinda AI'a rehberlik eder. MV3 service worker restart guvenligi icin kritiktir.

**Triggers:** "storage'a yaz", "storage'dan oku", "ayar ekle", "settings guncelle", "veri migrasyonu", "chrome.storage", "storage key", "quota"

**Ne Zaman Yuklenir:** Storage yapisi degisikligi, yeni storage key ekleme, settings yonetimi, data migration gorevlerinde.

---

## 1. chrome.storage.local vs session

| Ozellik | local | session |
|---------|-------|---------|
| **Sure** | Kalici (extension silinene kadar) | Oturum sureli (tarayici kapanana kadar) |
| **Service Worker Restart** | Korunur | Korunur |
| **Quota** | 10 MB (10240 KB) | 1 MB (1024 KB) |
| **Surum Guncellemesi** | Korunur | Sifirlanir |
| **Kullanim** | Settings, filter listeler, allowlist | Tab counter, seed, log cache |

```js
// Kalici veri — ayarlar, konfigurasyon
const { GLOBAL_SETTINGS } = await chrome.storage.local.get('GLOBAL_SETTINGS');

// Oturumluk veri — sayaç, tohum, log
const { TAB_COUNTER } = await chrome.storage.session.get('TAB_COUNTER');
```

---

## 2. Anahtar Isimlendirme

Tutarlilik icin tum anahtarlar `SCREAMING_SNAKE_CASE` formatinda. `src/config.js` icinde `KEYS` objesi olarak toplanir.

```js
// src/config.js
export const KEYS = {
  // local (kalici)
  GLOBAL_SETTINGS: 'GLOBAL_SETTINGS',
  FILTER_LISTS: 'FILTER_LISTS',
  ALLOW_LIST: 'ALLOW_LIST',
  BLOCK_LIST: 'BLOCK_LIST',
  SERVER_OVERRIDES: 'SERVER_OVERRIDES',
  COSMETIC_RULES: 'COSMETIC_RULES',

  // session (oturumluk)
  TAB_COUNTER: 'TAB_COUNTER',
  SITE_SEEDS: 'SITE_SEEDS',
  SHIELD_STATE: 'SHIELD_STATE',
  LOG_CACHE: 'LOG_CACHE',
};
```

---

## 3. Settings Hierarchy (Global → Per-Site)

```js
// 1. Global settings (options sayfasindan)
const { GLOBAL_SETTINGS } = await chrome.storage.local.get('GLOBAL_SETTINGS');

// 2. Per-site override (dynamic DNR ile)
async function getShieldState(hostname) {
  const hash = stringToHash(hostname);
  const key = `SHIELD_STATE_${hash}`;
  const state = await chrome.storage.session.get(key);
  return state[key] || GLOBAL_SETTINGS.shieldState;
}

// 3. Merge: per-site > global > default
function resolveSettings(hostname) {
  const global = GLOBAL_SETTINGS || DEFAULT_SETTINGS;
  const perSite = getPerSiteOverride(hostname);
  return merge(global, perSite); // per-site overrides global
}
```

---

## 4. Write-Through Cache Deseni

Service worker restart'inda veri kaybini onlemek icin.

```js
// Background.js write-through cache pattern
class LogCache {
  async get() {
    const { LOG_CACHE } = await chrome.storage.session.get('LOG_CACHE');
    return LOG_CACHE || [];
  }

  async add(entry) {
    const logs = await this.get();
    logs.push({ ...entry, timestamp: Date.now() });

    // Kapasite kontrolu: max 100 log
    if (logs.length > 100) logs.splice(0, logs.length - 100);

    await chrome.storage.session.set({ LOG_CACHE: logs });
  }

  async clear() {
    await chrome.storage.session.remove('LOG_CACHE');
  }
}
```

---

## 5. Deep Merge ile Settings Guncelleme

```js
// src/utils.js
export function merge(target, source) {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    // Prototype pollution korumasi
    if (key === '__proto__' || key === 'constructor') continue;

    const sourceVal = source[key];
    const targetVal = target[key];

    if (isObject(sourceVal) && isObject(targetVal)) {
      result[key] = merge(targetVal, sourceVal); // recursive
    } else {
      result[key] = sourceVal; // override
    }
  }

  return result;
}

// Kullanim
async function updateSettings(partial) {
  const { GLOBAL_SETTINGS } = await chrome.storage.local.get('GLOBAL_SETTINGS');
  const current = GLOBAL_SETTINGS || DEFAULT_SETTINGS;
  const merged = merge(current, partial);
  await chrome.storage.local.set({ GLOBAL_SETTINGS: merged });
}
```

---

## 6. Storage Quota Yonetimi

### 6.1. Limitler

```js
const QUOTA = {
  local: {
    MAX: 10240 * 1024,  // 10 MB
    WARN: 8192 * 1024,  //  8 MB — uyari esigi
  },
  session: {
    MAX: 1024 * 1024,   // 1 MB
    WARN: 768 * 1024,   // 768 KB — uyari esigi
  }
};
```

### 6.2. Quota Kontrolu

```js
async function checkQuota(storageArea = 'local') {
  const bytes = await chrome.storage[storageArea].getBytesInUse();
  const limit = QUOTA[storageArea].MAX;
  const usage = (bytes / limit * 100).toFixed(1);
  console.debug(`Storage ${storageArea}: ${usage}% (${(bytes/1024).toFixed(1)} KB)`);
  return { bytes, limit, usagePercent: Number(usage) };
}
```

### 6.3. Veri Sikistirma

```js
// Buyuk filter listelerini kucultmek icin
function compressRules(rules) {
  return rules.map(r => ({
    i: r.id,
    p: r.priority,
    a: r.action.type,
    c: r.condition.urlFilter
  }));
}

function decompressRules(compressed) {
  return compressed.map(r => ({
    id: r.i,
    priority: r.p,
    action: { type: r.a },
    condition: { urlFilter: r.c }
  }));
}
```

---

## 7. Veri Migrasyonu

Extension guncellemelerinde storage semasi degistiginde.

```js
const STORAGE_VERSION = 2; // manifest.json version'dan bagimsiz

async function migrateStorage() {
  const { STORAGE_VER } = await chrome.storage.local.get('STORAGE_VER');
  const currentVer = STORAGE_VER || 0;

  if (currentVer >= STORAGE_VERSION) return;

  // v0 -> v1: Anahtar yeniden adlandirma
  if (currentVer < 1) {
    const { settings_old } = await chrome.storage.local.get('settings_old');
    if (settings_old) {
      await chrome.storage.local.set({ GLOBAL_SETTINGS: settings_old });
      await chrome.storage.local.remove('settings_old');
    }
  }

  // v1 -> v2: Yeni varsayilan alan ekleme
  if (currentVer < 2) {
    const { GLOBAL_SETTINGS } = await chrome.storage.local.get('GLOBAL_SETTINGS');
    if (GLOBAL_SETTINGS && !('autoShred' in GLOBAL_SETTINGS)) {
      GLOBAL_SETTINGS.autoShred = false;
      await chrome.storage.local.set({ GLOBAL_SETTINGS });
    }
  }

  await chrome.storage.local.set({ STORAGE_VER: STORAGE_VERSION });
}
```

---

## 8. Performans Optimizasyonu

### 8.1. Batch Okuma

```js
// KOTU — birden fazla ayri cagri
const settings = await chrome.storage.local.get('GLOBAL_SETTINGS');
const lists = await chrome.storage.local.get('FILTER_LISTS');

// IYI — tek cagrida birlestir
const { GLOBAL_SETTINGS, FILTER_LISTS } = await chrome.storage.local.get([
  'GLOBAL_SETTINGS',
  'FILTER_LISTS'
]);
```

### 8.2. Gereksiz Yazmayi Onleme

```js
async function updateIfChanged(key, newValue) {
  const current = await chrome.storage.local.get(key);
  if (JSON.stringify(current[key]) === JSON.stringify(newValue)) {
    return; // degisiklik yok, yazma
  }
  await chrome.storage.local.set({ [key]: newValue });
}
```

### 8.3. onChange Dinleyicisi

```js
// Diger context'lerdeki degisiklikleri yakala
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.GLOBAL_SETTINGS) {
    // Settings degisti, UI'yi guncelle
    handleSettingsChanged(changes.GLOBAL_SETTINGS.newValue);
  }
});
```

---

## Anti-Pattern'ler

- **Storage'da secret saklama:** API anahtari, sifre, token `chrome.storage`'a yazilmaz. Storage sifreli degildir.
- **Content script'ten dogrudan storage erisimi:** Content script'ler `chrome.storage`'a dogrudan erisememeli. Message passing ile background uzerinden erisilmeli.
- **Quota limitlerini ignore etme:** 10MB/1MB limitleri asilirsa `QUOTA_BYTES` hatasi alinir. Buyuk veri (filter listeler) DNR ruleset olarak tutulmali, storage'da degil.
- **Ayni key'e concurrent write:** Iki asenkron islem ayni storage key'ine ayni anda yazarsa race condition olusur. Write queue kullan.
- **Storage'da DNR kurali saklama:** DNR kurallari `chrome.declarativeNetRequest` API'si uzerinden yonetilmeli, storage'da degil.
