# Sunum Prompt Yönetimi — Tasarım

Tarih: 2026-07-12

## Amaç

Sunum üretimi bugün kodda sabit bir prompt'a bağlı: bölüm listesi (`SectionKey`), her bölümün
görev tarifi (`SECTION_BRIEF`), sistem promptu ve AI parametreleri (`tier: "simple"`,
`maxTokens: 1600`) hep `lib/presentation.ts` içinde gömülü. Kullanıcı sunum metnini ancak
üretildikten sonra elle düzeltebiliyor; **neyin nasıl üretileceğine** karışamıyor.

Bu tasarım, sunum üretiminin tamamını — AI'ya giden ham prompt dahil — panelden yönetilebilir
hâle getirir.

## Kapsam kararları

1. **Bölümler artık sabit değil.** Panelden yeni bölüm eklenir, silinir, adı ve AI brief'i
   yazılır, sırası değiştirilir, açılıp kapatılır. `SectionKey` birliği kalkar.
2. **Firma bağlamı da şablon.** AI'ya giden firma verisi bloğu `{{firma}}`, `{{sektor}}` gibi
   değişkenlerle yazılan düzenlenebilir bir şablondur.
3. **Firma bazlı kalıcı override yok.** Prompt'lar globaldir. Tek bir üretim için sapmak
   gerekirse editördeki "yeniden üret" düğmesine **tek seferlik ek talimat** yazılır; kaydedilmez.
4. **Çıktı formatı talimatı kilitli.** `[[bölüm-anahtarı]]` etiketleme kuralı sistem tarafından
   prompt'un sonuna her zaman eklenir; kullanıcı görebilir, silemez. Böylece sunum asla boş gelmez.
5. Ek kontroller: ham prompt önizleme (AI çağrısı yok), gerçek firma ile test üretimi, global AI
   ayarları (model seviyesi + token bütçesi), varsayılana dön.

## Veri modeli

`PresentationTemplate` (zaten var olan tekil "şablon" satırı) genişler:

| Alan | Tip | İçerik |
|---|---|---|
| `systemPrompt` | `String?` | Kullanıcının yazdığı üslup/içerik kuralları |
| `contextTemplate` | `String?` | Firma bağlam şablonu (değişkenli) |
| `defaultSections` | `Json` *(var, kullanılmıyordu)* | `[{ key, title, brief, enabled }]` |
| `aiTier` | `String?` | `simple` \| `complex` |
| `maxTokens` | `Int?` | Toplu üretim bütçesi (varsayılan 1600) |
| `sectionMaxTokens` | `Int?` | Tek bölüm yeniden üretimi (varsayılan 400) |

Tüm alanlar boş bırakılabilir; boşsa kodda duran **fabrika varsayılanı** kullanılır. "Varsayılana
dön" = alanları `null`'a çekmek. Migration sonrası mevcut kurulum aynen çalışmaya devam eder.

**Bölüm anahtarı** başlıktan türetilir ve ASCII slug'dır ("Referanslarımız" → `referanslarimiz`),
çünkü bu anahtar AI'nın döndüreceği `[[etiket]]`. Anahtar bir kez üretilir; başlık sonradan
değişse bile sabit kalır, aksi hâlde eski sunumların içerik haritası kopardı.

**Mevcut sunumlar etkilenmez.** Her `Presentation` bölüm listesini kendi `sectionConfig` JSON'unda
snapshot olarak taşır. Ayarlardan bir bölüm silinse bile eski sunum kendi kopyasıyla açılır.

## Prompt kurgusu

AI'ya giden istek üç parçadan kurulur:

```
system  = [kullanıcının systemPrompt'u]
        + [KİLİTLİ format talimatı]        ← sistem ekler, silinemez

prompt  = renderTemplate(contextTemplate, vars)   ← firma bağlamı
        + [bölüm listesi: 1. [[key]] "Başlık" — brief]
        + [varsa tek seferlik ek talimat]
```

Tek bölüm yeniden üretilirken bölüm listesi yerine yalnız o bölümün brief'i gider ve kilitli
talimat "sadece bölüm metnini üret, başlık ekleme"ye dönüşür (etiketleme gerekmez).

### Değişkenler

`{{firma}}` `{{sektor}}` `{{sehir}}` `{{telefon}}` `{{adres}}` `{{puan}}` `{{website_var}}`
`{{website}}` `{{website_analiz}}` `{{google_profil}}` `{{rakip}}` `{{firsatlar}}`

**Satır kuralı:** bir satırdaki değişkenlerin *hepsi* boşsa o satır prompt'a hiç girmez. Bir
kısmı doluysa boşlar sessizce silinir. Tanınmayan değişken boş sayılır. Böylece "Website analizi:"
gibi öksüz etiketler AI'ya gitmez.

## Modüller

Sorumluluk sınırları net olsun diye üretim mantığı `lib/presentation.ts`'ten ayrılır:

- **`lib/presentation/prompts.ts`** — saf fonksiyonlar, DB/AI yok. Fabrika varsayılanları, kilitli
  format talimatları, değişken listesi, `slugify`, `renderTemplate`, `buildAllPrompt`,
  `buildOnePrompt`, `parseSections`. Test edilebilir çekirdek burası.
- **`lib/presentation/vars.ts`** — firma + analiz kaydından değişken sözlüğü üretir; örnek
  (sample) sözlüğü de burada. Bugün iki ayrı route'ta kopyalanmış bağlam kurma kodu buraya toplanır.
- **`lib/presentation/config.ts`** — `PresentationTemplate` satırından prompt yapılandırmasını
  okur/yazar/sıfırlar, gelen veriyi doğrular (slug tekilliği, en az bir açık bölüm, token sınırları).
- **`lib/presentation.ts`** — yalnız HTML render'ı ve AI çağrısını yapan iki ince fonksiyon kalır.

## API

| Yol | İş |
|---|---|
| `GET /api/settings/prompts` | Yapılandırmayı döner |
| `PATCH /api/settings/prompts` | Kaydeder (doğrulamadan geçirir) |
| `DELETE /api/settings/prompts` | Fabrika ayarına döner |
| `POST /api/settings/prompts/preview` | **Kaydedilmemiş** yapılandırmadan ham prompt üretir (AI yok) |
| `POST /api/settings/prompts/test` | **Kaydedilmemiş** yapılandırmayı gerçek firmada çalıştırır, sonucu döner; sunum kaydetmez |

Önizleme ve test gövdedeki yapılandırmayı kullanır — böylece kaydetmeden deneyebilirsin.

`POST /api/presentations/[id]/section` gövdesine isteğe bağlı `extra` (tek seferlik ek talimat)
eklenir. `POST /api/businesses/[id]/presentation` artık `DEFAULT_SECTIONS` yerine kayıtlı
yapılandırmayı kullanır.

## Ekran

`/ayarlar/promptlar` — Ayarlar listesine yeni kart. Bölümleri:

1. **Sistem promptu** — büyük textarea. Altında soluk, salt-okunur kilitli format talimatı.
2. **Firma bağlam şablonu** — textarea + tıklanınca imlece eklenen değişken çipleri.
3. **Bölümler** — sıralı liste; her satırda aç/kapa, başlık, brief textarea, yukarı/aşağı, sil.
   Altta "yeni bölüm".
4. **AI ayarları** — model seviyesi (ucuz/güçlü), token bütçeleri.
5. **Araç çubuğu** — Ham promptu gör (modal), Firma seçip test et (modal), Varsayılana dön, Kaydet.

Test için firma listesi sayfa sunucusunda hazırlanıp prop olarak geçer (yeni API'ye gerek yok).

Sunum editöründe "yeniden üret" düğmesi açılır bir ek talimat kutusu kazanır.

## Hata durumları

- Kaydetme: başlıksız bölüm, sıfır açık bölüm, çakışan slug → 400 + Türkçe mesaj.
- Test: AI hatası/kota → mesaj olduğu gibi gösterilir, hiçbir şey kaydedilmez.
- Üretim: AI bir bölümü döndürmezse o bölüm boş kalır (bugünkü davranış), editörde
  "yeniden üret" ile tamamlanır.

## Doğrulama

`scripts/check-prompts.mts` (mevcut `check-themes.mts` kalıbı, DB/AI gerekmez):
slug üretimi ve tekilliği, satır kuralı (boş değişkenli satır düşer), kilitli talimatın her zaman
eklenmesi, özel anahtarlı çıktının doğru ayrıştırılması, doğrulama hataları.
