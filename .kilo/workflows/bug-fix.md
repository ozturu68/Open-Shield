# Workflow: Hata Cozumu (Bug Fix)

## Bu Workflow Ne Ise Yarar?

Bu workflow, bir hatanin sistematik olarak cozulmesi surecini tanimlar. openShield'e ozgu hata kategorileri (service worker teardown, DNR ID collision, storage senkronizasyonu, mesaj gecis hatasi) ve debug yaklasimlari icerir.

**Ne Zaman Kullanilir:** Kullanici "su hatayi duzelt", "bug fix", "X calismiyor", "DNR kurali eslesmiyor", "popup veri gostermiyor" dediginde.

**Kac Adim:** 7 ana adim
**Tahmini Sure:** Hatanin karmasikligina gore degisir

---

## On Kosullar (Baslamadan Once)

AI su dosyalari okumali:
1. `.kilo/memory-bank/context.md` — Bilinen hatalar listesi
2. `.kilo/memory-bank/history.md` — Gecmis benzer hatalar
3. `.kilo/rules/coding-standards.md` — Kodlama standartlari
4. `src/config.js` — MSG tipleri, KEY sabitleri (hata mesaji formatini anlamak icin)

---

## Adim 1: Hatayi Tanimlama ve Siniflandirma

**Amac:** Hatayi tam olarak anlamak ve openShield ozgu kategoriye yerlestirmek.

### 1.1. Hata Bilgisi Toplama
- [ ] Hata mesaji nedir? (Chrome console'dan stack trace)
- [ ] Hangi bilesende oldu? (service worker / content script / popup / options)
- [ ] `chrome://extensions` → "Inspect views: service worker" console'u kontrol et
- [ ] Hangi ortamda oldu? (local yuklu uzanti)
- [ ] Kullanici hangi adimlari izledi? (reproduce steps)

### 1.2. openShield Hata Kategorileri

| Kategori | Aciklama | Tipik Belirti |
|----------|----------|--------------|
| **Service Worker Teardown** | SW idle sonrasi sonlandirildi, in-memory state kayboldu | Popup eski veriyi gosteriyor, logCache bos |
| **DNR Kural Collision** | Ayni ID iki dynamic kuralda kullanildi | `updateDynamicRules` hatasi, kural eklenemedi |
| **DNR Kural Eslesmeme** | Kural yanlis condition, regex veya resourceType | Reklam engellenmiyor, HTTPS yukseltilmiyor |
| **Storage Senkronizasyonu** | storage.local/session yazilamadi/okunamadi | Ayarlar kaydedilmiyor, tab counter sifirlaniyor |
| **Mesaj Gecis Hatasi** | Popup → SW message handler input validasyon hatasi | `{ error: "invalid parameters" }` response |
| **Content Script Enjeksiyonu** | MAIN-world script dogru calismiyor | Farbling uygulanmadi, WebRTC IP siziyor |
| **Manifest/Permission** | Eksik izin, yanlis host_permissions | DNR calismiyor, content script yuklenmedi |

### 1.3. Hata Onceligi
| Seviye | Tanim | Ornek (openShield) |
|--------|-------|-------------------|
| P0 (Kritik) | Guvenlik acigi, veri sizintisi | WebRTC IP sizintisi, storage'dan veri calinmasi |
| P1 (Yuksek) | Temel fonksiyon bozuk | Reklam engellenmiyor, HTTPS yukseltilmiyor |
| P2 (Orta) | Yan fonksiyon bozuk | Popup sayaç guncellenmiyor, log bos |
| P3 (Dusuk) | Kozmetik | Icon guncellenmiyor, badge text yanlis |

### 1.4. Bilinen Hata Mi?
- [ ] `.kilo/memory-bank/history.md` kontrol et — benzer hata var mi?
- [ ] Son filter liste guncellemesi mi bozdu? (`rules/*.json` diff'i)

**Cikti:** Hata tanimi, kategorisi ve oncelik seviyesi

---

## Adim 2: Reproduce (Yeniden Uretme)

**Amac:** Hatanin tekrarlanabilir oldugunu dogrulamak.

### 2.1. openShield Debug Adimlari
- [ ] `chrome://extensions` → uzantiyi bul → "Inspect views: service worker"
- [ ] Service worker console'unda `chrome.storage.local.get(null)` ile storage durumunu kontrol et
- [ ] `chrome.declarativeNetRequest.getDynamicRules()` ile dinamik DNR kurallarini listele
- [ ] `chrome.declarativeNetRequest.getEnabledRulesets()` ile aktif ruleset'leri kontrol et
- [ ] Hatayi minimal site/test sayfasi ile yeniden uret

### 2.2. MV3 Ozgu Debug Araclari
- [ ] `onRuleMatchedDebug` listener'i — DNR kuralinin eslesip eslesmedigini log'lar
- [ ] `chrome.storage.session.get(null)` — Oturum verisini dump et
- [ ] `chrome.tabs.get(tabId)` — Sekme URL'sini ve durumunu kontrol et
- [ ] Content script console: sayfa uzerinde `F12` → Console → content script mesajlari

### 2.3. Reproduce Dokumantasyonu
```
Hata: [Kisa tanim]
Kategori: [Service Worker Teardown / DNR Collision / Storage Sync / ...]
Ortam: Local MV3 uzantisi
Adimlar:
1. [Adim 1]
2. [Adim 2]

Beklenen: [Ne olmali?]
Gerceklesen: [Ne oldu?]
Hata Mesaji: [Stack trace]
```

**Cikti:** Reproduce basarili

---

## Adim 3: Kok Neden Analizi (Root Cause Analysis)

**Amac:** Hatanin NEDENINI bulmak.

### 3.1. Kategori Bazli Analiz

**Service Worker Teardown:**
- [ ] In-memory deger (Map, degisken) kaybolup storage'dan fallback yapilmamis mi?
- [ ] `logCache` veya counter Map'i dogru sekilde session'a yaziliyor mu?
- [ ] `pushLog()` ve `counters()` fallback mantigi calisiyor mu?

**DNR Kural Collision:**
- [ ] `allowId()` hash fonksiyonu aynı hostname icin farkli ID uretiyor mu?
- [ ] Dinamik kural ID araligi dogru mu? (100000-149999 toggle, 150000-199999 allowlist)
- [ ] `updateDynamicRules` cagrisinda hem `removeRuleIds` hem `addRules` aynı cagrida mi?

**Storage Senkronizasyonu:**
- [ ] `chrome.storage.local.set()` sonrasi `await` ediliyor mu?
- [ ] Birden fazla yazma islemi race condition yaratiyor mu?
- [ ] `chrome.storage.session` quota limiti asildi mi? (10MB)

**Mesaj Gecis Hatasi:**
- [ ] Message handler input validasyonu gecmedi mi? (`isValidHostname`, `ALLOWED_SITE_KEYS`)
- [ ] `sender.tab.id` undefined oldugu durum var mi?
- [ ] Async handler `return true` yapiyor mu? (senkron reply icin zorunlu)

### 3.2. 5 Neden Teknigi (Ornek)
```
Hata: Popup sayaç 0 gosteriyor
Neden 1: counters() 0 donuyor
Neden 2: storage.session COUNTERS bos
Neden 3: inc() cagrilmamis
Neden 4: onRuleMatchedDebug listener tetiklenmemis
Neden 5: declarativeNetRequestFeedback permission manifest'te yok
```

**Cikti:** Kok neden tespit edildi

---

## Adim 4: Cozum Tasarimi

**Amac:** Hatayi duzeltmenin EN IYI yolunu bulmak.

### 4.1. Cozum Alternatifleri
| Alternatif | Avantaj | Dezavantaj |
|------------|---------|-----------|
| A: Hizli fix (tek satir) | Hemen cozer | Tech debt yaratabilir |
| B: Kapsamli fix | Kokunden cozer | Daha uzun surer |
| C: Storage fallback ekle | Service worker teardown'a dayanikli | Kod karmasikligi artar |

### 4.2. MV3 Ozgu Duzeltme Rehberi
- Service worker state kaybi → Her zaman storage fallback ekle
- DNR ID collision → ID araligini kontrol et, `allowId()` hash'i gozden gecir
- Storage race condition → `await` zincirini kontrol et, `Promise.all` kullan
- Mesaj validasyon hatasi → `ALLOWED_*_KEYS` Set'ine anahtari ekle
- Content script calismiyor → manifest `content_scripts` matches pattern'ini kontrol et

**Cikti:** Cozum karari

---

## Adim 5: Implementasyon

**Amac:** Cozumu kodlamak.

### 5.1. Branch Olusturma
```bash
git checkout -b fix/[hata-tanimi]
```

### 5.2. Kod Degisikligi
- [ ] Sadece gerekli degisikligi yap (scope disina cikma)
- [ ] `.kilo/rules/coding-standards.md` MV3 kurallarina uy
- [ ] Eger DNR kurali degisiyorsa `node tools/build.js` ile valide et
- [ ] Eger manifest degisiyorsa permission/rule_resources kontrol et

### 5.3. Ornek Commit Mesaji
```
fix(background): service worker teardown'da logCache kaybi

Kok Neden: logCache in-memory Map service worker sonlandirilinca
sifirlaniyordu, storage.session'dan fallback yapilmiyordu.

Cozum: getLog() storage.session'dan fallback yapacak sekilde duzeltildi.

Test: node --test tests/unit/**/*.test.js basarili
Build: node tools/build.js basarili
```

**Cikti:** Kod duzeltildi

---

## Adim 6: Test ve Dogrulama

**Amac:** Cozumun calistigini dogrulamak.

### 6.1. Reproduce Testi
- [ ] Hatayi tekrar uretme adimlarini izle
- [ ] Hata artik olusmuyor mu?

### 6.2. openShield Testleri
- [ ] `node --test tests/unit/**/*.test.js` — Tum unit testler geciyor
- [ ] `node tools/build.js` — Manifest ve DNR validasyonu basarili
- [ ] Manuel: `chrome://extensions` → uzantiyi yeniden yukle → test et

### 6.3. MV3 Ozgu Edge Case'ler
- [ ] Service worker idle → terminate → tekrar uyan (state korunuyor mu?)
- [ ] DNR kurali aynı ID ile tekrar eklenmeye calisiliyor mu? (collision)
- [ ] Storage session/local arasi gecis dogru calisiyor mu?

**Cikti:** Testler gecti, hata cozuldu

---

## Adim 7: Memory Bank Guncellemesi

**Amac:** Gelecekte ayni hatayi onlemek icin bilgiyi kaydetmek.

### 7.1. History.md Guncellemesi
```markdown
## [Tarih]: [Kategori] - [Kisa Tanim]

- **Hata:** [Aciklama]
- **Kok Neden:** [Neden]
- **Cozum:** [Nasil duzeltildi]
- **Dosyalar:** [Etkilenen dosyalar]
- **Onlem:** [Gelecekte nasil onlenir]
- **Kategori:** [Service Worker Teardown / DNR Collision / Storage Sync / ...]
```

### 7.2. Context.md Guncellemesi
- [ ] Bilinen hatalar listesinde varsa, cozuldu olarak isaretle
- [ ] Yeni hata pattern'i tespit edildi mi? `.kilo/rules/coding-standards.md`'e ekle

### 7.3. Kullaniciya Teslim
```
Hata: [Tanim]
Durum: Cozuldu
Kategori: [openShield kategori]

Kok Neden: [Temel neden]
Cozum: [Ne yapildi?]

Test:
- node --test tests/unit/**/*.test.js: [Sonuc]
- node tools/build.js: [Sonuc]

Onlem:
- [Gelecekte tekrar olmamasi icin]
```

---

## Hizli Referans: openShield Debug Komutlari

```javascript
// Service worker console'da kullanilabilecek debug komutlari:

// Storage durumu
chrome.storage.local.get(null).then(console.log)
chrome.storage.session.get(null).then(console.log)

// Dinamik DNR kurallari
chrome.declarativeNetRequest.getDynamicRules().then(console.log)

// Aktif ruleset'ler
chrome.declarativeNetRequest.getEnabledRulesets().then(console.log)

// Sekme bilgisi
chrome.tabs.query({active: true, currentWindow: true}).then(tabs => console.log(tabs[0]))

// onRuleMatchedDebug (background.js'te zaten aktif, console'da log gorunur)
```

---

## SSS

**S: Hata reproduce edilemiyorsa?**
C: Service worker'i `chrome://extensions` → "Inspect views" uzerinden canli izle. `chrome.runtime.reload()` ile yeniden baslatmayi dene. Intermittent sorunlar icin `console.log` ekleyip log akisini takip et.

**S: DNR kuralinin eslesip eslesmedigini nasil anlarim?**
C: `background.js`'teki `onRuleMatchedDebug` listener'i tum eslesmeleri log'lar. Service worker console'unda `ruleId` ve `rulesetId` ciktisini kontrol et.

**S: Ayni hata tekrarliyorsa?**
C: `.kilo/memory-bank/history.md`'ye bak — kok neden analizi yanlis yapilmis olabilir. Daha derinlemesine incele, kod degisikligi yerine mimari degisiklik gerekebilir.
