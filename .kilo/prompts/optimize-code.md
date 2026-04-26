---
purpose: code-optimization
target: any-ai
usage: paste-with-context
workflow: .kilo/workflows/refactoring.md
---

# Prompt: Kod Optimizasyonu (Optimize Code)

## Bu Prompt Ne Icin?

Bu prompt, **openShield'de performans iyilestirmesi, refactoring veya kod kalitesi artirimi yaparken** kullanilir. MV3 uzantisi ozgusu: DNR kural verimliligi, service worker wake-up frekansi, storage okuma/yazma optimizasyonu, content script performansi.

**Ne Zaman Kullanilir:**
- DNR kurallarini optimize ederken (regex → urlFilter)
- Service worker wake-up frekansini azaltirken
- Storage okuma/yazma sayisini azaltirken
- Content script (cosmetic.js) MutationObserver batching yaparken
- background.js dosyasini bolerken
- Kod tekrarini azaltirken

---

## Kullanim Sekli

### 1. Mevcut durumu olc / profille
### 2. Bu prompt'u doldur
### 3. AI'a gonder

---

## Prompt Sablonu

```
## OPTIMIZASYON GOREVI

### Hedef
[Ne optimize edilecek?]

### openShield Optimizasyon Kategorisi
- [ ] DNR Kural Verimliligi — regexFilter → urlFilter, resourceType daraltma
- [ ] Service Worker Wake-Up — Gereksiz event listener, onCommitted frekansi
- [ ] Storage I/O Optimizasyonu — Gereksiz okuma/yazma, batch islemler
- [ ] Content Script Performansi — MutationObserver batching, selector optimizasyonu
- [ ] Bellek Kullanimi — In-memory Map temizleme, log limiti
- [ ] Kod Organizasyonu — Dosya bolme, fonksiyon extract, duplikasyon azaltma
- [ ] MAIN-world Injection — Self-contained yapma, gereksiz injection'lar

### Mevcut Durum
- **Metrik / Sorun:** [Su anki olcum veya gozlem]
- **Hedef:** [Hedeflenen durum]
- **Fark:** [Iyilesme hedefi]

#### Mevcut Kod
```javascript
[Optimize edilecek kod parcasi veya dosya adi]
```

#### Etkilenen Bilesenler
- [ ] src/background.js
- [ ] src/cosmetic.js
- [ ] src/bounce.js
- [ ] rules/*.json
- [ ] popup/options
- [ ] tools/

### Kapsam
- [ ] [Optimize edilecek alan 1]
- [ ] [Optimize edilecek alan 2]
- [ ] Disinda: [Optimize edilmeyecek]

### MV3 Kisitlari (Korunmasi Gerekenler)
- [ ] Service worker state guvenligi bozulmamali (storage fallback korunmali)
- [ ] DNR kural ID collision yaratilmamali
- [ ] Content script ESM import eklenmemeli (IIFE korunmali)
- [ ] MAIN-world injection self-contained kalmali
- [ ] Davranis degismemeli (black-box ayni)
- [ ] Testler kirilmamali
- [ ] Build (`node tools/build.js`) basarili kalmali

### CALISMA YONTEMI

Lutfen `.kilo/workflows/refactoring.md` workflow'unu takip et:

1. Analiz — Etki analizi yap, risk degerlendir
2. Test Korumasi — `node --test tests/unit/**/*.test.js` ile mevcut testleri dogrula
3. Kademeli Implementasyon — Kucuk adimlar, her adimda test + build kontrolu
4. MV3 Inceleme — Service worker state, DNR collision, injection self-contained kontrolu
5. Butunlestirme — Tum testler + build basarili mi?
6. Memory Bank — `.kilo/memory-bank/architecture.md` veya `history.md` guncelle

## ANALIZ RAPORU BEKLENIYOR

Optimizasyon oncesi bana sunlari sun:

1. **Mevcut problem nedir?** (Kok neden)
2. **Nasil cozulecek?** (Teknik yaklasim)
3. **Ne kadar iyilesme bekleniyor?** (Tahmini metrik)
4. **Riskler neler?** (Ne bozulabilir? MV3 kisitlari ihlal edilir mi?)
5. **Kac dosya etkilenecek?** (Kapsam)

Onayladiktan sonra implementasyona basla.
```

---

## Ornek 1: DNR Kural Optimizasyonu

```
## OPTIMIZASYON GOREVI: DNR Kurallarinda regexFilter → urlFilter

### Hedef
DNR kural eslesme performansini artirmak. regexFilter, urlFilter'a gore
daha yavas calisir. Regex yerine basit urlFilter kullanilabilecek kurallari
donustur.

### openShield Optimizasyon Kategorisi
- [x] DNR Kural Verimliligi — regexFilter → urlFilter

### Mevcut Durum
- rules/easylist.json icinde regexFilter kullanan 12 kural var
- Bunlardan 8 tanesi basit domain eslesmesi — regex gerekmiyor

#### Mevcut Kod
```json
{
  "id": 12,
  "priority": 1,
  "action": { "type": "block" },
  "condition": {
    "regexFilter": "^https?://.*\\.doubleclick\\.net/.*",
    "resourceTypes": ["script", "image", "xmlhttprequest"]
  }
}
```

### Kapsam
- [x] rules/easylist.json — 8 kural regexFilter → urlFilter
- [x] rules/easyprivacy.json — 3 kural regexFilter → urlFilter
- [ ] Disinda: Dinamik kurallar (zaten urlFilter kullaniyor)

### MV3 Kisitlari
- [x] DNR kural ID'leri degismemeli (collision riski)
- [x] Kural sayisi artmamali

## ANALIZ RAPORU BEKLENIYOR
Optimizasyon oncesi analiz raporunu sun.
```

---

## Ornek 2: Content Script Performansi

```
## OPTIMIZASYON GOREVI: Cosmetic.js MutationObserver Batching

### Hedef
MutationObserver callback'ini batch'leyerek DOM mutasyonu yogun
sayfalarda CPU kullanimini azaltmak.

### openShield Optimizasyon Kategorisi
- [x] Content Script Performansi — MutationObserver batching

### Mevcut Durum
MutationObserver her DOM degisikliginde ayri ayri `querySelectorAll`
cagrisi yapiyor. SPA sayfalarda (React, Vue) saniyede yuzlerce
mutasyon olabiliyor.

### Kapsam
- [x] src/cosmetic.js — requestAnimationFrame ile batch'leme
- [ ] Disinda: bounce.js (MutationObserver kullanmiyor)

### MV3 Kisitlari
- [x] Content script IIFE kalmali, ESM import eklenmemeli
- [x] `"use strict"` korunmali
- [x] `run_at: document_start` — documentElement null kontrolu korunmali

## ANALIZ RAPORU BEKLENIYOR
```

---

## Ornek 3: Service Worker Storage Optimizasyonu

```
## OPTIMIZASYON GOREVI: Storage Yazma Sayisini Azaltma

### Hedef
`inc()` ve `pushLog()` fonksiyonlarinda her cagrida storage.session'a
yazma yapiliyor. Sik kural eslesmelerinde (ornegin reklam yogun siteler)
saniyede onlarca yazma islemi olabiliyor. Bunu batch'leyerek azalt.

### openShield Optimizasyon Kategorisi
- [x] Storage I/O Optimizasyonu — Gereksiz yazma, batch islemler

### Mevcut Durum
- Her `inc()` ve `pushLog()` cagrisi `chrome.storage.session.set()` yapiyor
- Storage session quota: 10MB (sorun degil ama I/O yuksek)
- Service worker teardown'da son batch kaybolabilir

### Kapsam
- [x] src/background.js — inc(), pushLog(), counters(), getLog()
- [ ] Disinda: Diğer storage islemleri (ayarlar seyrek yaziliyor)

### MV3 Kisitlari
- [x] Service worker teardown'da veri kaybi olmamali — flush mekanizmasi
- [x] In-memory Map + storage fallback pattern'i korunmali

## ANALIZ RAPORU BEKLENIYOR
```

---

## openShield Optimizasyon Hizli Referansi

### DNR Performans Siralamasi (Hizli → Yavas)
1. `urlFilter` + `initiatorDomains` — En hizli
2. `urlFilter` — Hizli
3. `regexFilter` — Daha yavas (kacin, mumkunse urlFilter'a cevir)
4. `requestDomains` / `excludedDomains` — urlFilter ile ayni seviye

### Storage Performans Ipuclari
- `chrome.storage.session` local'a gore daha hizlidir (memory-mapped)
- Sik yazilan veriyi (counter, log) session'da tut
- `storage.session.set()` cagrilarini `requestAnimationFrame` veya debounce ile batch'le
- `storage.local.get()` sonuclarini in-memory cache'le (fallback ile)

### Content Script Performans Ipuclari
- MutationObserver callback'ini `requestAnimationFrame` ile batch'le
- `querySelectorAll` sonuclarini cache'le (DOM degismedikce)
- CSS selector'leri optimize et: `#id` > `.class` > `tag` > `[attr]`
- Gereksiz `getComputedStyle` cagrilarindan kacin (reflow tetikler)

---

## Ipucular

- **Metrikleri olcun:** "Yavas" demek yerine "her inc() 2ms suruyor" deyin
- **Hedefi belirleyin:** "Daha hizli" yerine "storage yazma sayisini %80 azalt" deyin
- **MV3 kisitlarini unutmayin:** Service worker teardown, DNR collision, IIFE limitasyonu
- **Benchmark tekrar edin:** Optimizasyon sonrasi karsilastirma yapin
- **Black-box test:** Davranis degismemeli — ayni input → ayni output
