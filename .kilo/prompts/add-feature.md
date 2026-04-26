---
purpose: feature-development
target: any-ai
usage: paste-with-context
workflow: .kilo/workflows/feature-development.md
---

# Prompt: Ozellik Ekleme (Add Feature)

## Bu Prompt Ne Icin?

Bu prompt, **openShield'e yeni bir ozellik eklerken** kullanilir. MV3 tarayici uzantisi ozgusu: hangi bilesen etkilenecek, hangi MV3 kisitlari goz onunde bulundurulmali, hangi izinler gerekli.

**Ne Zaman Kullanilir:**
- Yeni DNR kurali / ruleset eklerken
- Service worker'a yeni islev eklerken
- Yeni content script olustururken
- Popup/options UI'a yeni ozellik eklerken

---

## Kullanim Sekli

### 1. `.kilo/memory-bank/context.md`'i guncelle (aktif gorev olarak ekle)
### 2. Bu prompt'u kopyala ve doldur
### 3. AI'a gonder

---

## Prompt Sablonu

```
## GOREV: [Ozellik Adi]

### Ozet
[Kisa aciklama — 1-2 cumle]

### Hangi Bilesen Etkilenecek?
- [ ] Service Worker (src/background.js)
- [ ] Content Script — ISOLATED world (src/cosmetic.js, src/bounce.js)
- [ ] Content Script — MAIN-world injection (background.js icinde self-contained fonksiyon)
- [ ] Popup UI (popup/)
- [ ] Options UI (options/)
- [ ] DNR Rules — Statik (rules/*.json)
- [ ] DNR Rules — Dinamik (background.js updateDynamicRules)
- [ ] Manifest (manifest.json)

### Kapsam
Bu ozellik su seyleri yapabilmeli:
1. [Ana islev 1]
2. [Ana islev 2]
3. [Ana islev 3]

### Disinda (Out of Scope)
- [Yapilmayacak 1]
- [Yapilmayacak 2]

### Kabul Kriterleri
- [ ] [Kriter 1 — test edilebilir]
- [ ] [Kriter 2 — test edilebilir]
- [ ] [Kriter 3 — test edilebilir]

### Teknik Detaylar
- **Dosyalar:** [Hangi dosyalar olusturulacak/degistirilecek?]
- **API:** [Yeni chrome.* API kullanimi var mi?]
- **Storage:** [Yeni storage key gerekiyor mu? local mi session mi?]
- **DNR:** [Yeni statik kural mi, dinamik kural mi? ID araligi nedir?]
- **UI:** [Popup/options degisikligi var mi?]

### MV3 Kisitlari ve Dikkat Edilecekler
- [ ] Service worker teardown'a dayanikli mi? (storage fallback)
- [ ] MAIN-world injection varsa, fonksiyon self-contained mi?
- [ ] Content script varsa, IIFE formatinda mi? ESM import yok mu?
- [ ] DNR kural ID'si collision-free mi?
- [ ] Manifest permission least-privilege mi?
- [ ] Input validasyonu var mi? (onMessage handler)

### Gerekiyorsa Yeni Permission'lar
- [ ] `manifest.json` permissions: [list]
- [ ] Gerekce: [Neden bu izin gerekli?]

### Bagimliliklar
- [Bagimli ozellik 1 — bu olmadan calismaz]

### Riskler
- [Teknik risk 1]
- [Teknik risk 2]

## CALISMA YONTEMI

Lutfen `.kilo/workflows/feature-development.md` workflow'unu takip et:

1. Analiz — Mevcut kodu incele, benzer ozellikleri bul
2. Tasarim — MV3 uyumlu mimari tasarimi yap, kullaniciya onaylat
3. Implementasyon — Kod yaz (implementasyon sirasi: manifest.json → config.js → utils.js → background.js → content scripts → popup/options)
4. Test — Unit testleri yaz, `node --test tests/unit/**/*.test.js` ile dogrula
5. Build — `node tools/build.js` ile manifest ve DNR validasyonunu dogrula
6. Review — MV3 kod inceleme kontrollerini uygula
7. Memory Bank — `.kilo/memory-bank/` dosyalarini guncelle

Her adimda bana ozet rapor ver ve onayimi al.

## KISITLAR

- `.kilo/rules/coding-standards.md` — ES2022, ESM/IIFE, JSDoc kurallarina uy
- `.kilo/rules/architecture-rules.md` — MV3 katman kurallarina uy
- `.kilo/rules/security-rules.md` — Guvenlik kurallarina uy (input validasyonu, prototype pollution)
- Sifir runtime npm bagimliligi — yeni paket EKLENMEZ
- `node --test tests/unit/**/*.test.js` hatasiz calismali
- `node tools/build.js` basarili olmali
```

---

## Ornek 1: DNR Kurali Ekleme

```
## GOREV: Yeni Tracker Domain'leri Engelleme

### Ozet
EasyPrivacy ruleset'ine 5 yeni tracker/analytics domain'i ekle.

### Hangi Bilesen Etkilenecek?
- [x] DNR Rules — Statik (rules/easyprivacy.json)

### Kapsam
1. rules/easyprivacy.json'a yeni domain kurallari ekle
2. Her kural icin unique ID ata (mevcut en yuksek ID + 1)
3. node tools/build.js validasyonundan gec

### Disinda
- Dinamik kural eklenmeyecek
- UI degisikligi yok

### Kabul Kriterleri
- [ ] 5 yeni domain DNR kurali olarak eklenmis
- [ ] ID'ler unique
- [ ] node tools/build.js basarili
- [ ] node --test tests/unit/**/*.test.js geciyor

### Teknik Detaylar
- **Dosyalar:** rules/easyprivacy.json
- **DNR:** Statik kural, priority: 1, action.type: "block"
- **MV3 Kisitlari:** Kural sayisi 30K limitini asmamali

## CALISMA YONTEMI
Lutfen `.kilo/workflows/feature-development.md` workflow'unu takip et.
```

---

## Ornek 2: Service Worker Ozelligi

```
## GOREV: Sekme Bazli Bellek Kullanimi Limitleme

### Ozet
Cok fazla sekme acildiginda logCache ve diger in-memory Map'lerin
bellek kullanimini sinirlandir. En eski 50 sekme disindakileri temizle.

### Hangi Bilesen Etkilenecek?
- [x] Service Worker (src/background.js)

### Kapsam
1. logCache Map boyutunu 50 sekme ile sinirla
2. En eski girisleri otomatik temizle
3. Storage.session'daki veriyi de temizle

### Disinda
- UI degisikligi yok
- DNR degisikligi yok

### Kabul Kriterleri
- [ ] 50'den fazla sekme acildiginda en eski log'lar temizleniyor
- [ ] Storage.session temizligi senkron
- [ ] node --test tests/unit/**/*.test.js geciyor

### MV3 Kisitlari ve Dikkat Edilecekler
- [x] Service worker teardown'a dayanikli mi? — storage.session'dan fallback okuma zaten var
- [ ] Input validasyonu var mi? — gerek yok (dahili temizlik)

### Teknik Detaylar
- **Dosyalar:** src/background.js (logCache temizleme mantigi)
- **Storage:** storage.session LOG key'i guncellenmeli

## CALISMA YONTEMI
Lutfen `.kilo/workflows/feature-development.md` workflow'unu takip et.
```

---

## Ipucular

- **Hangi bilesen etkilenecek?** sorusu kritik — AI dogru dosyayi hedeflemeli
- **MV3 kisitlari** bolumunu doldur — AI'in gozden kacirmamasi gerekenleri hatirlat
- **Permission** eklemek ciddi bir karar — gerekcesini mutlaka belirt
- **Out of scope** net olmali — AI'in scope disina cikmasini engeller
