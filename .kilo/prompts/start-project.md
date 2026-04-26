---
purpose: project-initialization
target: any-ai
usage: paste-with-context
---

# Prompt: Proje Baslatma (Start Project)

## Bu Prompt Ne Icin?

Bu prompt, **yeni bir AI oturumunda openShield projesini tanitmak** icin kullanilir. AI projenin tam baglamini anlamasini saglar. openShield sifir bagimlilikli, MV3 Chromium tarayici uzantisidir.

**Ne Zaman Kullanilir:**
- Yeni bir AI oturumu baslattiginda
- Baska bir AI'a (ChatGPT, Claude, Gemini) projeyi analiz ettirmek istediginde
- Kilo Code memory bank'i yeniden baslatmak istediginde

---

## Kullanim Sekli

### 1. AI'a okutmasi gereken dosya yolunu belirt
### 2. Asagidaki prompt'u gonder

---

## Prompt Sablonu

```
Sen deneyimli bir yazilim gelistiricisin. Asagidaki proje dosyalarini inceleyerek openShield projesini tam olarak anlaman gerekiyor.

## openShield Hakkinda

openShield, Chromium tabanli tarayicilar icin sifir bagimlilikli, Brave Shields benzeri gizlilik korumasi saglayan bir Manifest V3 tarayici uzantisidir. Tum kod vanilla JavaScript (ES2022), tum API Web Extension API'leri, tum veri chrome.storage uzerinde yerel olarak saklanir.

## PROJE TANIMA ASAMASI

Lutfen SU SIRAYLA dosyalari oku:

1. **Kok dizin AGENTS.md** — Proje ozeti, dizin yapisi, MV3 kisitlar, kodlama standartlari
2. **`.kilo/memory-bank/project-brief.md`** — Proje amaci, kapsam, rakip analizi
3. **`.kilo/memory-bank/tech-stack.md`** — Kullanilan chrome.* API'leri, yasakli teknolojiler
4. **`.kilo/memory-bank/architecture.md`** — Service worker → DNR → content script mimarisi
5. **`.kilo/rules/coding-standards.md`** — ES2022, ESM/IIFE, JSDoc, anti-pattern'ler
6. **`.kilo/rules/architecture-rules.md`** — MV3 katman kurallari, DNR stratejisi
7. **`.kilo/rules/security-rules.md`** — Guvenlik kurallari (input validasyonu, prototype pollution)
8. **`.kilo/context/project-overview.md`** — Tam dizin yapisi ve modul durumlari

## ANAHTAR DOSYALAR (Mutlaka Incele)

openShield'in calisan kodunu anlamak icin su dosyalara goz at:

- `manifest.json` — MV3 yapilandirmasi: izinler, DNR ruleset, content script deklarasyonu, icon'lar
- `src/background.js` — Service worker: tum is mantiginin merkezi (~400 satir)
- `src/config.js` — Sabitler: DEFAULT_SETTINGS, KEY, SESSION, MSG, BOUNCE_DOMAINS
- `src/utils.js` — Saf yardimci fonksiyonlar: hostname, merge, seed, isValidHostname
- `src/cosmetic.js` — ISOLATED world CSS reklam gizleme (MutationObserver)
- `src/bounce.js` — ISOLATED world bounce link tespiti

## SONRA

Projeyi analiz et ve asagidaki sorulari yanitla:

1. openShield ne yapar? (1 paragraf)
2. Kullanilan temel chrome.* API'leri neler? (Liste)
3. Mimarisi nasil? (Service worker → DNR → content script → storage akisi)
4. MV3 kisitlari neler? (3 kritik kisit)
5. DNR Rule ID araliklari nasil yonetiliyor?
6. Service worker state yonetimi nasil yapiliyor?
7. Modul sistemi kurallari neler? (hangi dosya ESM, hangisi IIFE)
8. Guvenlik onlemleri neler? (en az 3 madde)

## ANALIZ SONRASI

Eger proje hakkinda yeterince bilgi topladiysan, bana soyle:
"openShield'i anladim. Tum moduller aktif. Tech stack: JavaScript ES2022 + Chrome MV3 API'leri.
MV3 kisitlari: service worker idle teardown, DNR sadece, sifir runtime npm.
Sorularin varsa sor, yoksa goreve baslayabilirim."

## GOREV

[Buraya yapmak istediginiz gorevi yazin]
Ornegin:
- "EasyPrivacy'a yeni tracker domain'leri ekle"
- "Popup'a site bazli bounce sayaç ekle"
- "Cosmetic.js'teki CSS selector performansini optimize et"
- "Yeni bir DNR ruleset olustur: social-media-block"

## EK BILGI

- Proje: openShield (MV3 Chromium uzantisi)
- Dil: JavaScript ES2022, sifir bagimlilik
- Proje dizini: [proje-kok-dizini]
- Mevcut branch: [branch-adi]
- Son commit: [commit-hash veya mesaj]
```

---

## Ornek Tam Prompt

```
Sen deneyimli bir yazilim gelistiricisisin. Asagidaki proje dosyalarini inceleyerek openShield projesini tam olarak anlaman gerekiyor.

openShield, Chromium tabanli tarayicilar icin sifir bagimlilikli, Brave Shields benzeri gizlilik korumasi saglayan bir Manifest V3 tarayici uzantisidir.

Lutfen su sirayla dosyalari oku:
1. AGENTS.md (kok dizin)
2. .kilo/memory-bank/project-brief.md
3. .kilo/memory-bank/tech-stack.md
4. .kilo/memory-bank/architecture.md
5. .kilo/rules/coding-standards.md
6. .kilo/rules/architecture-rules.md
7. .kilo/rules/security-rules.md
8. .kilo/context/project-overview.md

ANAHTAR DOSYALAR: manifest.json, src/background.js, src/config.js, src/utils.js

Projeyi analiz et ve ozetini ver.

GOREV: EasyPrivacy ruleset'ine yeni tracker domain'leri ekle.
Yeni domain'ler: example-tracker.com, analytics-evil.net

Proje dizini: /home/user/projects/openShield
Mevcut branch: feature/more-trackers
```

---

## Ipucular

- **Kilo Code kullaniyorsan:** Bu prompt'a gerek yok — Kilo Code otomatik olarak `.kilo/` ve kok AGENTS.md dosyalarini okur
- **Dosya boyutu:** AI'in context penceresi kucukse, once AGENTS.md ve project-brief.md ver, sonra detay iste
- **Odakli analiz:** Belirli bir bilesen hakkinda bilgi istiyorsan (ornegin sadece DNR), ilgili dosyalari ver: manifest.json + rules/*.json + background.js DNR kismi
- **MV3 kontrolu:** AI'a "MV3 kisitlarini goz onunde bulundur" hatirlatmasi yap
