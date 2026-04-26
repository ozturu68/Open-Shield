---
purpose: bug-fix
target: any-ai
usage: paste-with-context
workflow: .kilo/workflows/bug-fix.md
---

# Prompt: Hata Cozumu (Fix Bug)

## Bu Prompt Ne Icin?

Bu prompt, **openShield'de bir hatayi cozerken** kullanilir. MV3 tarayici uzantisina ozgu hata kategorileri (service worker teardown, DNR collision, storage sync, message failure) ve debug yaklasimlari icerir.

**Ne Zaman Kullanilir:**
- Popup veri gostermiyor / sayaç 0
- DNR kurali eslesmiyor / reklam engellenmiyor
- Service worker console'da hata var
- Ayarlar kaydedilmiyor
- Content script (cosmetic/bounce) calismiyor
- Farbling uygulanmiyor

---

## Kullanim Sekli

### 1. Hatayi gozlemle, `chrome://extensions` console'unu kontrol et
### 2. Bu prompt'u doldur
### 3. AI'a gonder

---

## Prompt Sablonu

```
## HATA RAPORU

### Hata Tanimi
[Kisa ve oz hata tanimi]

### openShield Hata Kategorisi
- [ ] Service Worker Teardown — SW sonlandirildi, in-memory state kayboldu
- [ ] DNR Kural Collision — Ayni ID'li iki kural catisti
- [ ] DNR Kural Eslesmeme — Kural condition yanlis, eslesme yok
- [ ] Storage Senkronizasyonu — storage.local/session okuma/yazma hatasi
- [ ] Mesaj Gecis Hatasi — Popup/options → SW message validasyon hatasi
- [ ] Content Script Enjeksiyonu — MAIN-world veya ISOLATED script calismiyor
- [ ] Manifest/Permission — Eksik izin, yanlis yapilandirma
- [ ] Diger: [Aciklama]

### Oncelik
- [ ] P0 — Kritik (Guvenlik acigi, veri sizintisi)
- [ ] P1 — Yuksek (Temel fonksiyon bozuk: reklam engellenmiyor)
- [ ] P2 — Orta (Yan fonksiyon bozuk: sayaç guncellenmiyor)
- [ ] P3 — Dusuk (Kozmetik: icon/badge)

### Ortam
- [ ] Local gelistirme (chrome://extensions)
- [ ] Chromium surumu: [versiyon]

### Hata Mesaji (Service Worker Console)
```
[Tam hata mesaji — chrome://extensions → Inspect views: service worker]
```

### Reproduce Adimlari
1. [Adim 1]
2. [Adim 2]
3. [Adim 3]
4. **Beklenen:** [Ne olmali?]
5. **Gerceklesen:** [Ne oldu?]

### Ilgili Kod / Dosya
- `src/background.js`: [satir araligi]
- `manifest.json`: [ilgili bolum]
- `rules/*.json`: [ilgili kural]

### Debug Kontrolleri (Varsa)
- [ ] `chrome.storage.local.get(null)` sonucu: [beklenen vs gercek]
- [ ] `chrome.storage.session.get(null)` sonucu: [beklenen vs gercek]
- [ ] `chrome.declarativeNetRequest.getDynamicRules()` sonucu: [ID'ler, sayi]
- [ ] `chrome.declarativeNetRequest.getEnabledRulesets()` sonucu: [aktif ruleset'ler]
- [ ] `onRuleMatchedDebug` log'lari: [kural eslesmesi var mi?]

## CALISMA YONTEMI

Lutfen `.kilo/workflows/bug-fix.md` workflow'unu takip et:

1. Tanimlama — Hatayi openShield kategorisine yerlestir
2. Reproduce — Hatayi yeniden uretmeye calis
3. Root Cause — 5 Neden teknigi ile kok neden analizi
4. Cozum Tasarimi — En az 2 alternatif sun, MV3 uyumlulugunu kontrol et
5. Implementasyon — Kod duzelt (branch: `fix/[hata-tanimi]`)
6. Test — `node --test tests/unit/**/*.test.js` + `node tools/build.js`
7. Memory Bank — `.kilo/memory-bank/history.md`'ye kaydet

## EK BILGI

- `.kilo/memory-bank/history.md`'de benzer hata var mi kontrol et
- `.kilo/memory-bank/context.md`'de bilinen sorunlar listesinde bu var mi?
- Guvenlik acigi iceriyor mu? (`.kilo/rules/security-rules.md`)
```

---

## Ornek 1: Service Worker State Kaybi

```
## HATA RAPORU

### Hata Tanimi
Popup'taki block sayaç her zaman 0 gosteriyor. Sayfa yenilense bile
artmiyor. Ancak `onRuleMatchedDebug` listener'i calisiyor ve console'da
kural eslesmeleri gorunuyor.

### openShield Hata Kategorisi
- [ ] Service Worker Teardown — SW sonlandirildi, in-memory state kayboldu
- [ ] Storage Senkronizasyonu — storage.session okuma/yazma hatasi
- [x] Diger: counter Map storage'a yazilmiyor olabilir

### Oncelik
- [x] P2 — Orta (Yan fonksiyon bozuk: sayaç guncellenmiyor)

### Reproduce Adimlari
1. openShield'i yukle
2. Reklamli bir siteye git (ornegin: cnn.com)
3. Popup'i ac — sayaç 0
4. chrome://extensions → service worker console — kural eslesme log'lari var
5. Beklenen: Popup'ta sayaç > 0
6. Gerceklesen: Popup'ta sayaç 0

### Debug Kontrolleri
- [x] `chrome.storage.session.get(null)` → COUNTERS: {}
- [x] `onRuleMatchedDebug` log'lari → kural eslesmeleri var
- [ ] Beklenen: COUNTERS'ta tabId bazli degerler olmali

## CALISMA YONTEMI
Lutfen `.kilo/workflows/bug-fix.md` workflow'unu takip et.
```

---

## Ornek 2: DNR Kurali Eslesmeme

```
## HATA RAPORU

### Hata Tanimi
`rules/easylist.json`'a eklenen yeni domain kurali eslesmiyor.
Siteye gidince reklamlar engellenmiyor. Ancak eski kurallar calisiyor.

### openShield Hata Kategorisi
- [x] DNR Kural Eslesmeme — Kural condition yanlis, eslesme yok

### Oncelik
- [x] P1 — Yuksek (Reklam engellenmiyor)

### Reproduce Adimlari
1. openShield'i guncelle (yeni ruleset ile)
2. rules/easylist.json'daki yeni domain'e ait bir siteye git
3. Beklenen: Site engellenmeli
4. Gerceklesen: Site yukleniyor, reklamlar gorunuyor

### Ilgili Kod
`rules/easylist.json` satir 45:
```json
{
  "id": 45,
  "priority": 1,
  "action": { "type": "block" },
  "condition": { "urlFilter": "badadserver.com", "resourceTypes": ["script"] }
}
```

### Muhtemel Neden
resourceTypes sadece "script" olarak sinirlandirilmis.
Reklam istekleri "image", "xmlhttprequest" veya "sub_frame" olabilir.

## CALISMA YONTEMI
Lutfen `.kilo/workflows/bug-fix.md` workflow'unu takip et.
```

---

## openShield Debug Hizli Referansi

```javascript
// Service worker console'da kullan (chrome://extensions → Inspect views)

// Storage durumu
chrome.storage.local.get(null).then(console.log)
chrome.storage.session.get(null).then(console.log)

// DNR durumu
chrome.declarativeNetRequest.getDynamicRules().then(console.log)
chrome.declarativeNetRequest.getEnabledRulesets().then(console.log)
chrome.declarativeNetRequest.getMatchedRules({}).then(console.log)

// Sekme bilgisi
chrome.tabs.query({active: true, currentWindow: true}).then(t => console.log(t[0]))

// Message test (popup simulasyonu)
chrome.runtime.sendMessage({type: "GET_STATE", tabId: 123}).then(console.log)
```

---

## Ipucular

- **Hata kategorisini dogru secin:** Yanlis kategori AI'i yanlis yonlendirir
- **Debug kontrol sonuclarini ekleyin:** Storage ve DNR durumu kok neden analizini hizlandirir
- **Stack trace tam olmali:** Service worker console ciktisini kesmeden verin
- **Reproduce adimlari net olmali:** AI hatayi kendi basina tekrar uretebilmeli
- **onRuleMatchedDebug:** DNR kuralinin eslesip eslesmedigini anlamak icin en iyi arac
