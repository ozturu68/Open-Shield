---
name: code-review
description: JavaScript ES2022 ve MV3 tarayici uzantisi kod inceleme surecleri, kalite kontrol checklist'leri ve kod koku tespiti. openShield uzantisi icin optimize edilmistir.
version: 2.0.0
author: AI Entegrasyon Ekibi
last_updated: 2026-04-26
---

# Code Review Skill — openShield

## Bu Skill Ne Ise Yarar?

MV3 tarayici uzantisi kod incelemesinde AI'in sistematik kod analizi yapmasini saglar. Service worker teardown guvenligi, DNR ID celiskisi, prototype pollution ve MAIN-world izolasyonu gibi openShield ozgu kontroller icerir.

**Ne Zaman Yuklenir:** Kod inceleme, PR review, kalite kontrol, guvenlik taramasi gibi gorevlerde.

**Triggers:** "kodu review et", "PR gozden gecir", "kalite kontrol", "guvenlik taramasi", "code smell var mi"

---

## 1. Kod Inceleme Sureci

### 1.1. MV3 Inceleme Asamalari

```
1. MV3 Uygunluk Kontrolu
   → Service worker teardown-safe mi?
   → DNR kural ID'leri uygun aralikta mi?
   → Content script IIFE formatinda mi?

2. Guvenlik
   → Prototype pollution korumasi
   → Message handler validasyonu
   → MAIN-world enjeksiyon izolasyonu

3. Dogruluk
   → Storage read/write dogru mu?
   → Event listener siralari dogru mu?
   → Manifest permission least privilege

4. Performans
   → DNR regex agirligi
   → MutationObserver throttle
   → Service worker uyanma sikligi

5. Kod Kalitesi
   → ES2022 syntax
   → ESM/IIFE ayrimi
   → JSDoc varligi
   → Isimlendirme (camelCase, SCREAMING_SNAKE_CASE)
```

### 1.2. Inceleme Oncelikleri

1. **Guvenlik** → Prototype pollution, injection (bloklayici)
2. **MV3 Uygunlugu** → Service worker state kaybi, DNR celiskisi (bloklayici)
3. **Dogruluk** → Mantik hatasi, data loss (yuksek)
4. **Performans** → Gereksiz storage islemi, agir regex (orta)
5. **Stil** → Isimlendirme, format (dusuk)

---

## 2. openShield Code Smell'leri

| Smell | Tanimi | Ornek |
|-------|--------|-------|
| **In-Memory State** | Service worker'da global degisken | `let counter = 0;` (restart'ta kaybolur) |
| **ESM in Content Script** | Content script'te import kullanimi | `import { x } from './y.js';` (IIFE olmali) |
| **DNR ID Collision** | Dinamik kural ID'si uygun aralikta degil | ID=50000 (statik aralikta) |
| **Proto Pollution Gap** | merge() __proto__ filtrelemiyor | `obj['__proto__'].polluted = true` |
| **Non-Self-Contained Injection** | MAIN-world fn modul scope'u kullaniyor | `const x = moduleVar;` (serialize edilemez) |
| **Direct Storage in CS** | Content script chrome.storage'a dogrudan erisiyor | Message passing kullanilmali |
| **Magic DNR Priority** | Aciklanmamis DNR priority degeri | `priority: 999` (neden 999?) |
| **Missing JSDoc** | Export edilen fonksiyonda JSDoc yok | Proje standarti ihlali |
| **innerHTML Kullanimi** | DOM manipule etmede guvensiz yontem | `div.innerHTML = userInput;` |
| **Deep Nesting** | 3+ seviye if/for ic ice | Erken return veya extract function |

---

## 3. Guvenlik Checklist (MV3 Uzanti)

- [ ] `merge()` fonksiyonu `__proto__` ve `constructor` filtreliyor mu?
- [ ] Tum `chrome.runtime.onMessage` handler'lari input validasyonu yapiyor mu?
- [ ] DNR regex'leri ReDoS (catastrophic backtracking) riski tasiyor mu?
- [ ] `installFarbling` ve diger MAIN-world fn'ler self-contained mi?
- [ ] `chrome.scripting.executeScript` ile kullanici girdisi calistiriliyor mu?
- [ ] Storage'da hassas veri (token, key) var mi?
- [ ] Console log'larda PII veya debug bilgisi var mi?
- [ ] Manifest permissions gereksiz genisletilmis mi?
- [ ] `web_accessible_resources` gereksiz dosya aciyor mu?
- [ ] `innerHTML`, `eval`, `document.write` kullanilmis mi?

---

## 4. MV3 Uygunluk Checklist

- [ ] Service worker global scope'unda mutable state var mi?
- [ ] `chrome.storage.session` fallback her storage isleminde var mi?
- [ ] DNR dinamik kural ID'leri dogru aralikta mi? (100k-150k toggle, 150k-200k allowlist)
- [ ] Content script'ler IIFE formatinda ve `"use strict"` var mi?
- [ ] `background.js` import'lari ESM formatinda mi?
- [ ] `cosmetic.js` ve `bounce.js` manifest'te `world: "ISOLATED"` tanimli mi?
- [ ] `webNavigation.onCommitted` listener'i dogru filter ile mi?
- [ ] `chrome.alarms` kullaniliyorsa en az 1 dakika periyot mu?
- [ ] `manifest.json`'da `"type": "module"` background icin var mi?

---

## 5. Kod Kalitesi Standartlari (openShield)

### Isimlendirme
- Fonksiyon/degisken: `camelCase`
- Sabitler: `SCREAMING_SNAKE_CASE`
- Event handler: `handle<Event>` (ornegin `handleMessage`, `handleTabUpdate`)
- Dosya: `kebab-case.js`

### Yapi
- `src/`: Uzanti kodu (background, content scripts)
- `rules/`: DNR kural JSON dosyalari
- `popup/`: Popup UI
- `options/`: Options sayfasi
- `tests/unit/`: Birim testleri
- `tools/`: Build ve utility script'leri

### ES2022 Syntax
- `async/await` tercih et
- Arrow functions where appropriate
- Template literals string birlestirme yerine
- Optional chaining `?.` ve nullish coalescing `??`

---

## 6. Geri Bildirim Formati

```
🔴 [BLOCKER] Service worker'da in-memory state kullanilmis
   Dosya: src/background.js:42
   Sorun: `logCache` Map'i restart'ta kaybolur
   Cozum: `chrome.storage.session`'a yaz/oku

🟠 [HIGH] DNR kural ID'si yanlis aralikta
   Dosya: src/background.js:156
   Sorun: ID=75000 statik araligi kirletiyor
   Cozum: 100000-149999 araligina tasi

🟡 [MEDIUM] JSDoc eksik
   Dosya: src/utils.js:89
   Cozum: Export edilen fonksiyona JSDoc ekle

💡 [SUGGESTION] Erken return ile nesting azaltilabilir
   Dosya: src/background.js:200-230
   
👍 Hostname validasyonu dogru ve kapsamli yapilmis — guzel!
```

---

## Anti-Pattern'ler (Yapilmayacaklar)

- In-memory state in service worker (Map, Set, degisken) — storage.session kullan
- ESM import in content script — IIFE formatinda yaz
- innerHTML / document.write — safe DOM API'leri kullan
- DNR kural ID'sini elle rastgele atama — deterministik hash kullan
- Runtime npm bagimliligi ekleme — sifir bagimlilik korunmali
- Telemetri / analytics kodu ekleme — sifir izleme
- `console.log` birakma (ozellikle production'da)
- "Boyle yazilmis" deyip gecme — cozum oner
- Kisisel elestiri yapma — kod elestirisi yap
