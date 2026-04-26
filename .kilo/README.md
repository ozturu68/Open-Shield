# .kilo Dizini — openShield AI Entegrasyon Rehberi

## Bu Dizin Nedir?

Bu `.kilo/` dizini, **yapay zeka ile kodlama entegrasyonunun merkezidir.** Kilo Code eklentisi ve diger AI kodlama asistanlari icin openShield projesinin "beyni" ve "hafizasi" gorevi gorur.

openShield, **sifir bagimlilikli, ES2022 JavaScript, Chromium Manifest V3 tarayici uzantisi** olarak gelistirilmektedir. Bu dizindeki dosyalar, AI'in MV3 uzanti mimarisini, DNR kurallarini, service worker kisitlarini ve content script pattern'lerini anlamasi icin ozellestirilmistir.

---

## Dizin Yapisi

```
.kilo/
├── kilo.jsonc                  # Ana Kilo Code yapilandirmasi
├── AGENTS.md                   # Tum AI ajanlari icin evrensel davranis yonetmeligi
├── README.md                   # Bu dosya
│
├── agents/                     # Ozel AI ajan tanimlari
│   ├── code-reviewer.md        # MV3 uzanti kod inceleme
│   ├── architect.md            # MV3 mimari tasarim
│   ├── test-writer.md          # node:test tabanli test yazma
│   ├── docs-writer.md          # JSDoc ve MV3 dokumantasyonu
│   └── security-auditor.md     # Tarayici uzantisi guvenlik denetimi
│
├── skills/                     # openShield domain yetenekleri
│   ├── browser-extension-dev/  # MV3 uzanti gelistirme
│   │   └── SKILL.md
│   ├── privacy-protection/     # Gizlilik koruma teknikleri
│   │   └── SKILL.md
│   ├── storage-design/         # chrome.storage tasarimi
│   │   └── SKILL.md
│   └── code-review/            # Kod inceleme
│       └── SKILL.md
│
├── workflows/                  # Tekrarlanabilir is akislari
│   ├── feature-development.md  # MV3 ozellik gelistirme
│   ├── bug-fix.md              # MV3 hata cozumu
│   ├── refactoring.md          # MV3 refactoring
│   └── code-review.md          # Kod inceleme
│
├── memory-bank/                # Proje hafizasi
│   ├── project-brief.md        # openShield proje ozeti
│   ├── tech-stack.md           # Teknoloji yigini (Web Extension API)
│   ├── architecture.md         # MV3 mimari kararlari
│   ├── context.md              # Aktif calisma baglami
│   └── history.md              # Karar tarihcesi
│
├── rules/                      # Zorunlu proje kurallari
│   ├── coding-standards.md     # ES2022 JS kodlama standartlari
│   ├── architecture-rules.md   # MV3 mimari kurallari
│   ├── security-rules.md       # Tarayici uzantisi guvenligi
│   └── testing-rules.md        # node:test standartlari
│
├── context/                    # Proje baglam dosyalari
│   ├── project-overview.md     # Dizin yapisi ve modul durumu
│   ├── dependencies.md         # chrome.* API bagimliliklari
│   └── conventions.md          # Proje konvansiyonlari
│
└── prompts/                    # Kullanima hazir prompt sablonlari
    ├── start-project.md        # openShield'a baslangic
    ├── add-feature.md          # MV3 ozellik ekleme
    ├── fix-bug.md              # MV3 hata cozme
    └── optimize-code.md        # Uzanti optimizasyonu
```

---

## AI Onboarding Sirasi

Yeni bir AI openShield'da calismaya basladiginda su dosyalari sirayla okumalidir:

1. `AGENTS.md` (kok dizin) — Proje ozeti, dizin yapisi, teknik kisitlar
2. `.kilo/AGENTS.md` — AI davranis kurallari
3. `.kilo/memory-bank/project-brief.md` — Proje amaci ve kapsami
4. `.kilo/memory-bank/tech-stack.md` — Kullanilan API'ler
5. `.kilo/memory-bank/architecture.md` — MV3 mimarisi
6. `.kilo/rules/coding-standards.md` — Kodlama kurallari
7. `.kilo/rules/architecture-rules.md` — Mimari kurallar
8. `.kilo/memory-bank/context.md` — Aktif gorevler
9. `.kilo/memory-bank/history.md` — Gecmis kararlar

---

## Kullanim Senaryolari

### Senaryo 1: Yeni Ozellik
```
1. AI: memory-bank/architecture.md'i oku (MV3 mimarisi)
2. AI: workflows/feature-development.md'i oku
3. AI: Ilgili skill'i yukle (browser-extension-dev)
4. AI: Kod uret (background.js, DNR rules, content script)
5. AI: node --test ile test et
6. AI: node tools/build.js ile valide et
7. AI: memory-bank/context.md'i guncelle
```

### Senaryo 2: Hata Cozumu
```
1. AI: memory-bank/context.md'i oku (bilinen sorunlar)
2. AI: workflows/bug-fix.md'i oku
3. AI: Hata kategorisini belirle (SW teardown, DNR collision, ...)
4. AI: Root cause bul, fix uygula
5. AI: node --test ile dogrula
6. AI: history.md'e kaydet
```

### Senaryo 3: Kod Inceleme
```
1. AI (code-reviewer): rules/coding-standards.md'i oku
2. AI: rules/security-rules.md'i oku
3. AI: skills/code-review/SKILL.md'i yukle
4. AI: MV3 ozgu kontrolleri yap (SW state, DNR ID, permission)
5. AI: Geri bildirim raporu olustur
```

---

## Bakim Takvimi

### Her Gorev Sonrasi
- `memory-bank/context.md` guncelle
- Gerekirse `memory-bank/history.md`'e karar/hatalari kaydet

### Aylik
- `rules/` dosyalari guncel mi?
- `memory-bank/tech-stack.md` yeni API kullanimi var mi?

### Her Surum
- `memory-bank/architecture.md` mimari degisiklik var mi?
- `memory-bank/project-brief.md` kapsam degisti mi?
- `agents/` ajan davranislari uygun mu?

---

## Onemli Notlar

1. **Bu dizin versiyon kontrolune dahildir.** `.kilo/` Git'e eklenmelidir.
2. **Context dosyalari canli dokumandir.** Eski bilgi AI'in yanlis karar almasina yol acar.
3. **openShield sifir bagimlilikli bir projedir.** Runtime npm paketi eklenmez. Tum referanslar Web Extension API'lerinedir.
4. **Dil:** `.kilo/` dosyalari Turkce, kod yorumlari Ingilizce.

---

**Son Guncelleme:** 2026-04-26
**Sahibi:** openShield Gelistirici
