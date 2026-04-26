---
name: privacy-protection
description: Tarayici gizlilik koruma teknikleri: farbling, parmak izi engelleme, tracker bloklama, bounce tespiti ve WebRTC IP sizinti onleme. Brave Shields benzeri koruma.
version: 1.0.0
author: AI Entegrasyon Ekibi
last_updated: 2026-04-26
---

# Privacy Protection Skill — openShield

## Bu Skill Ne Ise Yarar?

Tarayici gizlilik koruma tekniklerini implemente ederken AI'a rehberlik eder. Farbling, parmak izi engelleme, tracker bloklama, bounce tespiti, URL parametre temizligi ve WebRTC IP sizinti onleme konularini kapsar.

**Triggers:** "farbling ekle", "parmak izi engelle", "tracker blokla", "bounce tespiti", "WebRTC IP leak", "gizlilik korumasi", "fingerprinting", "privacy"

**Ne Zaman Yuklenir:** Gizlilik korumasi ozellikleri gelistirme, farbling iyilestirme, tracker bloklama gorevlerinde.

---

## 1. Parmak Izi Yuzeyi

### 1.1. Canvas Fingerprinting

Saldirganlar Canvas API'sini kullanarak benzersiz parmak izi olusturur: metin veya emoji render edip `toDataURL()` ile hash alirlar.

```js
// openShield farbling: Canvas'a noise ekleyerek hash'i degistir
function installCanvasFarbling(seed) {
  const prng = createPRNG(seed);
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;

  HTMLCanvasElement.prototype.toDataURL = function() {
    const ctx = this.getContext('2d');
    const imageData = ctx.getImageData(0, 0, this.width, this.height);
    // Piksel duzeyinde noise ekle (PRNG ile deterministik)
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = prng.next() * 2 - 1;
      imageData.data[i] = Math.min(255, Math.max(0, imageData.data[i] + noise));
    }
    ctx.putImageData(imageData, 0, 0);
    return originalToDataURL.apply(this, arguments);
  };
}
```

### 1.2. WebGL Fingerprinting

WebGL renderer ve vendor bilgileri, GPU karakteristikleri ile parmak izi olusturulur.

```js
function installWebGLFarbling(seed) {
  const prng = createPRNG(seed);
  const originalGetParameter = WebGLRenderingContext.prototype.getParameter;

  WebGLRenderingContext.prototype.getParameter = function(param) {
    const result = originalGetParameter.call(this, param);
    // UNMASKED_VENDOR_WEBGL (37445) ve UNMASKED_RENDERER_WEBGL (37446)
    if (param === 37445 || param === 37446) {
      return addNoiseToString(result, prng);
    }
    return result;
  };
}
```

### 1.3. AudioContext Fingerprinting

`AudioContext.createOscillator` ve `createDynamicsCompressor` ile ses isleme farklari olculur.

```js
function installAudioFarbling(seed) {
  const prng = createPRNG(seed);
  const originalGetChannelData = AudioBuffer.prototype.getChannelData;

  AudioBuffer.prototype.getChannelData = function() {
    const data = originalGetChannelData.call(this);
    for (let i = 0; i < data.length; i++) {
      data[i] += (prng.next() - 0.5) * 1e-6; // cok kucuk noise
    }
    return data;
  };
}
```

### 1.4. Font Fingerprinting

Screen genisligi ve yukseklik olcumleri ile yuklu font listesi parmak izi olusturur.

```js
function installFontFarbling(seed) {
  // Screen boyutlarina kucuk random offset ekle
  Object.defineProperty(Screen.prototype, 'width', {
    get: () => originalWidth + (prng.next() > 0.5 ? 1 : 0)
  });
}
```

---

## 2. PRNG (Pseudo-Random Number Generator)

### 2.1. Seed Olusturma

```js
// Oturum bazli seed: her tab icin benzersiz
function generateSeed(tabId) {
  const sessionKey = `SEED_${tabId}`;
  let seed = sessionStorage.getItem(sessionKey);
  if (!seed) {
    seed = crypto.getRandomValues(new Uint32Array(1))[0];
    sessionStorage.setItem(sessionKey, seed);
  }
  return seed;
}
```

### 2.2. Deterministik PRNG

```js
function createPRNG(seed) {
  // Mulberry32 — basit, hizli, deterministik
  let state = seed | 0;
  return {
    next() {
      state = (state + 0x6D2B79F5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    reseed(newSeed) {
      state = newSeed | 0;
    }
  };
}
```

---

## 3. WebRTC IP Sizintisi Onleme

VPN veya proxy arkasinda gercek IP'nin sizmasi engellenir.

```js
function installWebRTCBlock() {
  // RTCPeerConnection'i tamamen blokla veya iceCandidate'i filtrele
  const OriginalRTCPeerConnection = window.RTCPeerConnection;

  window.RTCPeerConnection = function(config) {
    const pc = new OriginalRTCPeerConnection(config);
    const originalAddIceCandidate = pc.addIceCandidate;

    pc.addIceCandidate = function(candidate) {
      if (candidate && candidate.candidate) {
        const parts = candidate.candidate.split(' ');
        const ip = parts[4];
        if (isPrivateIP(ip)) return originalAddIceCandidate.call(this, candidate);
        return; // public IP'leri blokla
      }
      return originalAddIceCandidate.call(this, candidate);
    };

    return pc;
  };
}

function isPrivateIP(ip) {
  return /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
}
```

---

## 4. Beacon / Ping Engelleme

```js
function installBeaconBlock() {
  // sendBeacon override
  const originalSendBeacon = Navigator.prototype.sendBeacon;
  Navigator.prototype.sendBeacon = function() {
    return false; // istek gonderilmemis gibi davran
  };

  // fetch keepalive engelleme
  const originalFetch = window.fetch;
  window.fetch = function(resource, options) {
    if (options && options.keepalive) return Promise.reject();
    return originalFetch.apply(this, arguments);
  };
}
```

---

## 5. Bounce Tracking Tespiti

```js
// bounce.js (ISOLATED world content script)
(function () {
  "use strict";

  const BOUNCE_DOMAINS = [/* bounce_domains.json verisi */];

  window.addEventListener('beforeunload', function() {
    // Navigasyon oncesi bounce domain kontrolu
    const links = document.querySelectorAll('a[href]');
    for (const link of links) {
      const url = new URL(link.href, document.baseURI);
      if (BOUNCE_DOMAINS.includes(url.hostname)) {
        // Bounce domain'e yonlenme tespit edildi
        chrome.runtime.sendMessage({
          type: 'BOUNCE_DETECTED',
          domain: url.hostname
        });
      }
    }
  });
})();
```

---

## 6. URL Parametre Temizleme

DNR ile tracking parametreleri (utm_, fbclid, gclid) URL'den cikarilir.

```json
{
  "id": 10,
  "priority": 1,
  "action": {
    "type": "redirect",
    "redirect": {
      "transform": {
        "queryTransform": {
          "removeParams": ["utm_source", "utm_medium", "utm_campaign", "fbclid", "gclid", "gclsrc"]
        }
      }
    }
  },
  "condition": {
    "urlFilter": "*",
    "resourceTypes": ["main_frame", "sub_frame"]
  }
}
```

---

## 7. Third-Party Cookie Engelleme

DNR ile ucuncu taraf cookie ve storage erisimi engellenir.

```json
{
  "id": 50,
  "priority": 1,
  "action": {
    "type": "modifyHeaders",
    "responseHeaders": [
      { "header": "Set-Cookie", "operation": "remove" }
    ]
  },
  "condition": {
    "urlFilter": "*",
    "domainType": "thirdParty",
    "resourceTypes": ["main_frame", "sub_frame"]
  }
}
```

---

## 8. HTTPS Yonlendirme

```json
{
  "id": 100,
  "priority": 100,
  "action": { "type": "upgradeScheme" },
  "condition": {
    "urlFilter": "*",
    "resourceTypes": ["main_frame", "sub_frame", "script", "xmlhttprequest"]
  }
}
```

---

## 9. Auto-Shred

Site verilerini (cookie, localStorage, indexedDB) otomatik temizleme — DNR ile storage erisimini bloklayarak yapilir.

---

## Anti-Pattern'ler

- **Over-farbling (site kirma):** Agresif Canvas/WebGL noise site islevselligini bozar. Her site icin ayar yapilabilir olmali.
- **Tahmin edilebilir PRNG:** `Math.random` kullanma. Seed her oturumda `crypto.getRandomValues` ile olusturulmali.
- **Eksik IP filtreleme:** Sadece IPv4 degil, IPv6 private adresleri de kontrol edilmeli.
- **Agresif beacon bloklama:** Tum beacon isteklerini bloklamak site islevselligini bozabilir. Allowlist mekanizmasi olmali.
- **Farbling'siz site ziyaret edilebilir:** Kullanici per-site shields toggle ile farbling'i kapatabilmeli.
