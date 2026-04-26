---
name: browser-extension-dev
description: Chromium Manifest V3 tarayici uzantisi gelistirme rehberi. Service worker, DNR, content script ve MAIN-world enjeksiyon desenlerini kapsar. openShield projesi icin optimize edilmistir.
version: 1.0.0
author: AI Entegrasyon Ekibi
last_updated: 2026-04-26
---

# Browser Extension Dev Skill — openShield

## Bu Skill Ne Ise Yarar?

Sifir bagimlilikli, vanilla JavaScript ES2022 ve Web Extension API'leri kullanan Chromium MV3 tarayici uzantisi gelistirmede AI'a rehberlik eder. Service worker yasam dongusu, DNR kural tasarimi, content script desenleri ve MAIN-world enjeksiyon gibi openShield ozgu konulari kapsar.

**Triggers:** "yeni ozellik ekle", "DNR kurali yaz", "content script degistir", "service worker", "manifest guncelle", "build et", "uzanti gelistir"

**Ne Zaman Yuklenir:** Tarayici uzantisi ozellik gelistirme, DNR kurali ekleme, content script yazma, service worker mantigi degistirme gorevlerinde.

---

## 1. Service Worker Desenleri

### 1.1. Write-Through Cache

Service worker her an sonlandirilabilir. Tum state `chrome.storage.session` uzerinden yonetilir.

```js
// KOTU — In-memory state (restart'ta kaybolur)
let tabCounter = 0;

// IYI — Write-through cache
async function incrementTabCounter() {
  const { TAB_COUNTER } = await chrome.storage.session.get('TAB_COUNTER');
  const next = (TAB_COUNTER || 0) + 1;
  await chrome.storage.session.set({ TAB_COUNTER: next });
  return next;
}
```

### 1.2. Event Listener Kaydi

Event listener'lar senkron olarak `self.addEventListener` ile kaydedilmeli.

```js
// Service worker scope'unda
self.addEventListener('install', handleInstall);
self.addEventListener('activate', handleActivate);
chrome.runtime.onMessage.addListener(handleMessage);
chrome.webNavigation.onCommitted.addListener(handleWebNav, { url: [{ urlMatches: '.*' }] });
```

### 1.3. Restart Senaryosu

```js
// Her storage okumasinda "yoksa varsayilan" deseni
async function getSettings() {
  const { GLOBAL_SETTINGS } = await chrome.storage.local.get('GLOBAL_SETTINGS');
  return GLOBAL_SETTINGS || DEFAULT_SETTINGS;
}
```

---

## 2. DNR Kural Tasarimi

### 2.1. ID Araliklari

```
Statik kurallar:      1 - 99,999   (tools/convert-filters.js otomatik atar)
Dinamik toggle:  100,000 - 149,999  (hostname hash tabanli)
Dinamik allowlist: 150,000 - 199,999 (options sayfasindan)
```

### 2.2. Statik Kural Ekleme

```json
// rules/yeni_ruleset.json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": { "urlFilter": "||example.com/ads/*", "resourceTypes": ["script"] }
  }
]
```

`manifest.json`'a ekleme:
```json
{
  "declarative_net_request": {
    "rule_resources": [
      { "id": "yeni_ruleset", "enabled": true, "path": "rules/yeni_ruleset.json" }
    ]
  }
}
```

### 2.3. Dinamik Kural Ekleme

```js
async function addDynamicRule(ruleId, urlFilter) {
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [{
      id: ruleId,
      priority: 1,
      action: { type: 'block' },
      condition: { urlFilter, resourceTypes: ['main_frame'] }
    }]
  });
}
```

### 2.4. Priority Rehberi

- `allow` kurallari: 1000 (block'tan once eslesmeli)
- `block` kurallari: 1 (varsayilan)
- `modifyHeaders`: 500
- `redirect`/`upgradeScheme`: 100

---

## 3. Content Script Desenleri

### 3.1. ISOLATED World (Manifest Declaration)

Content script'ler manifest'te `world: "ISOLATED"` ile tanimlanir.

```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["src/cosmetic.js"],
    "run_at": "document_start",
    "world": "ISOLATED"
  }]
}
```

### 3.2. IIFE Formati

Content script'ler ESM import yapamaz. Her zaman IIFE formatinda:

```js
"use strict";

(function () {
  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;

  function hideAds() {
    // ISOLATED world — sayfa JS'ine erisim yok
    // DOM'a erisim var
  }

  if (document.readyState !== 'loading') {
    hideAds();
  } else {
    document.addEventListener('DOMContentLoaded', hideAds);
  }
})();
```

### 3.3. MutationObserver Deseni

```js
const observer = new MutationObserver((mutations) => {
  // Throttle: batch islemleri
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        checkAndHide(node);
      }
    }
  }
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});
```

---

## 4. MAIN-World Enjeksiyon

### 4.1. Self-Contained Fn Deseni

`chrome.scripting.executeScript` ile enjekte edilen fonksiyonlar serialize edilir. Modul scope'una referans iceremez.

```js
// KOTU — modul scope'u referansi
const SEED = 42;
function installFarbling() {
  Math.random = seededRandom(SEED); // SEED serialize edilemez
}

// IYI — self-contained
function installFarbling(seed) {
  Math.random = seededRandom(seed); // seed parametreden gelir
}

// Background'da enjeksiyon
chrome.scripting.executeScript({
  target: { tabId },
  world: 'MAIN',
  func: installFarbling,
  args: [seed]
});
```

### 4.2. Enjeksiyon Zamani

```js
chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return; // sadece main frame

  const settings = await getSettings();
  if (settings.blockFingerprinting) {
    chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      world: 'MAIN',
      func: installFarbling,
      args: [generateSeed(details.tabId)]
    });
  }
});
```

---

## 5. Storage Desenleri

### 5.1. local vs session

```js
// Kalici (surum guncellemelerinde kalir, 10MB)
chrome.storage.local.set({ GLOBAL_SETTINGS: settings });

// Oturumluk (service worker restart'inda kalir, tarayici kapandiginda silinir, 1MB)
chrome.storage.session.set({ TAB_COUNTER: 0 });
```

### 5.2. Anahtar Isimlendirme

```js
const KEYS = {
  GLOBAL_SETTINGS: 'GLOBAL_SETTINGS',           // local
  TAB_COUNTER: 'TAB_COUNTER',                    // session
  SITE_SEEDS: 'SITE_SEEDS',                      // session
  LOG_CACHE: 'LOG_CACHE',                        // session
  FILTER_LISTS: 'FILTER_LISTS',                  // local
  ALLOW_LIST: 'ALLOW_LIST',                      // local
};
```

---

## 6. Message Passing

```js
// Message type sabitleri (config.js)
export const MESSAGE_TYPES = {
  GET_SHIELD_STATE: 'GET_SHIELD_STATE',
  SET_SHIELD_STATE: 'SET_SHIELD_STATE',
  GET_STATS: 'GET_STATS',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
};

// Background handler (background.js)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  switch (message.type) {
    case MESSAGE_TYPES.GET_SHIELD_STATE:
      handleGetShieldState(sender).then(sendResponse);
      return true; // async response icin

    default:
      return false;
  }
});

// Popup sender (popup/popup.js)
const state = await chrome.runtime.sendMessage({
  type: MESSAGE_TYPES.GET_SHIELD_STATE,
  hostname: 'example.com'
});
```

---

## 7. Manifest.json En Iyi Pratikler

```json
{
  "manifest_version": 3,
  "name": "openShield",
  "version": "1.0.0",
  "background": {
    "service_worker": "src/background.js",
    "type": "module"
  },
  "permissions": [
    "declarativeNetRequest",
    "declarativeNetRequestWithHostAccess",
    "declarativeNetRequestFeedback",
    "storage",
    "scripting",
    "webNavigation",
    "alarms"
  ],
  "host_permissions": ["<all_urls>"],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

---

## 8. Build Araclari

```bash
node tools/build.js                          # Manifest ve DNR validasyonu + zip
node tools/build-hsts.js                     # HSTS preload listesi olustur
node tools/convert-filters.js                # ABP filtreleri -> DNR JSON
node tools/extract-cosmetic.js               # Kozmetik CSS kurallarini cikar
node tools/fetch-lists.js                    # Guncel filtre listelerini indir
CLEAN=1 node tools/build.js                 # Temiz build (dist'i sil)
```

---

## Anti-Pattern'ler

- **In-memory state in service worker:** Map, Set, global degiskenler restart'ta kaybolur. `chrome.storage.session` kullan.
- **ESM import in content script:** Manifest-declared content script'ler IIFE olmali. ESM desteklenmez.
- **innerHTML kullanimi:** `textContent`, `createElement` veya `insertAdjacentHTML` guvenli alternatifleri kullan.
- **DNR kural ID celiskisi:** ID araliklarina uy. Elle rastgele ID atama, deterministik hash fonksiyonu kullan.
- **Runtime npm bagimliligi:** openShield sifir bagimliliklidir. Lodash, axios vb. kullanma.
- **Telemetri:** Kullanici verisi toplama, analytics gonderme YASAK.
- **MAIN-world injection'da modul scope referansi:** Enjekte edilen fonksiyon `args` ile tum veriyi parametre olarak almali.
- **Senkron storage operasyonu:** `chrome.storage.local.get` her zaman await ile cagrilmali.
