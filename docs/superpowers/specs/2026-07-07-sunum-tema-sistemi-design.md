# Sunum Tema & Marka Sistemi — Tasarım

Tarih: 2026-07-07
Durum: Onaylandı (kullanıcı incelemesi bekliyor)

## 1. Amaç

Sunum PDF/HTML çıktısını "tek sabit tasarım"dan, **çok temalı + markalanabilir** gelişmiş bir sisteme çevirmek:

- Kullanıcı **6 hazır tema** arasından seçer (her biri farklı tipografi + palet + düzen).
- Kullanıcı **kendi ajans kimliğini** (logo, ajans adı, web sitesi, telefon, e-posta, adres, marka rengi) bir kez ayarlar; her sunuma otomatik yansır. Bu kimlik **müşteri firmadan bağımsızdır** (müşteri firma bilgisi zaten `Business`'tan gelir).
- Temalar **firma seçmeden, PDF üretmeden** anlık önizlenebilir.
- Tema seçimi **global varsayılan** + **sunum başına override** olarak iki seviyede yapılır.
- Tüm temalar **DamgaBilişim yeşil marka kimliğiyle** uyumludur (turuncu değil).

## 2. Kapsam dışı (YAGNI)

- Kullanıcının DB'den yeni tema oluşturması / tam görsel tema editörü. Temalar koddadır.
- Çoklu kullanıcı / çoklu ajans. Tek ajans (tekil `PresentationTemplate` satırı).
- Harici obje depolama (S3 vb.). Logo base64 olarak DB'de.
- Sunum içeriği/AI üretim akışında değişiklik. Sadece render + marka + tema.

## 3. Marka paleti (damgabilisim.com'dan çıkarıldı)

`lib/presentation/brand.ts` içinde sabitler:

```
green-700  #17913a   (ana / varsayılan marka rengi)
green-600  #22a83f
green      #2fbf4b
lime       #7ed957   (aksan)
ink        #16261b   (başlık / koyu zemin)
ink-2      #17211b
body       #33463b
muted      #6d7d74
cream      #f4faf5
mint       #d8f6e0
mint-2     #eafaef
line       rgba(23,145,58,.14)
```

Marka fontları: `Plus Jakarta Sans` (ana sans), `Caveat` (el yazısı aksan). Temalar ayrıca
Fraunces / IBM Plex vb. Google fontları kullanabilir.

**Varsayılan marka rengi** `#ea580c` (turuncu) → `#17913a` (yeşil) olarak değişir.

## 4. Veri modeli (Prisma)

### 4.1 `PresentationTemplate` (tekil satır = ajans markası)

Mevcut alanlar korunur; eklenenler:

```prisma
model PresentationTemplate {
  id              String             @id @default(cuid())
  defaultFormat   PresentationFormat @default(HTML)
  defaultSections Json
  logoUrl         String?            // base64 data-URI ("data:image/png;base64,...")
  brandColor      String?            // yoksa #17913a
  agencyName      String?            // YENİ — "DamgaBilişim" yerine kendi adı
  website         String?            // YENİ
  contact         Json?              // { phone, email, address }
  defaultThemeId  String?            // YENİ — yoksa "nane"
  updatedAt       DateTime           @updatedAt
}
```

Tekil satır kalıbı: `id = "singleton"` sabit anahtarla upsert edilir (`getBranding()` yoksa
varsayılanlarla oluşturur).

### 4.2 `Presentation`

```prisma
themeId String?   // YENİ — boşsa global defaultThemeId kullanılır
```

Migration: `prisma migrate dev --name sunum_tema_marka`.

## 5. Tema sistemi

### 5.1 Tema tipi (`lib/presentation/themes.ts`)

```ts
export type ThemeId =
  | "orman-koyu" | "nane" | "kurumsal-yesil"
  | "cesur" | "sicak-butik" | "teknoloji";

export type Theme = {
  id: ThemeId;
  name: string;          // "Nane"
  description: string;    // kısa tanım (galeri kartı)
  fonts: string;          // <link> href (Google Fonts)
  css: (accent: string) => string;  // accent = marka rengi; tema CSS'i üretir
  layout?: "standard" | "editorial"; // gerekiyorsa iskelet varyantı
};

export const THEMES: Record<ThemeId, Theme>;
export const THEME_LIST: Theme[];        // galeri sırası
export const DEFAULT_THEME_ID: ThemeId = "nane";
export function getTheme(id?: string | null): Theme; // bilinmeyen id → varsayılan
```

Her tema, marka rengini (`accent`) parametre alır ve kendi paletinin aksanını onunla ezer.
CSS değişkenleri (`--accent`, `--ink`, `--paper` ...) tema bazında set edilir; ortak iskelet
(`renderHtml`) bu değişkenleri kullanır.

### 5.2 6 tema

| id | Ad | Kapak | Tipografi | Palet notu |
|----|----|-------|-----------|-----------|
| `orman-koyu` | Orman Koyu | Koyu orman (`#16261b`) tam sayfa, yeşil ışıltı | Fraunces + Plus Jakarta | Krem içerik, mevcut düzenin markalı hali |
| `nane` | Nane (varsayılan) | Beyaz + nane gradyan, yuvarlak kartlar | Plus Jakarta Sans | Sitenin birebir dili; brand-native |
| `kurumsal-yesil` | Kurumsal Yeşil | Koyu yeşil bant + gri | IBM Plex Sans/Serif | Sakin, ciddi, güven |
| `cesur` | Cesur | Dev başlık, lime/parlak yeşil blok | Plus Jakarta 800 + Archivo | Hero tarzı, yüksek kontrast |
| `sicak-butik` | Sıcak/Butik | Krem, yumuşak yeşil, Caveat dokunuş | Fraunces + Caveat + Nunito | Samimi, yuvarlak |
| `teknoloji` | Teknoloji | Koyu orman, ince çizgi, neon `#2fbf4b` | Sora + JetBrains Mono | Modern, teknik |

Ortak kurallar: A4, `@page margin:0`, `print-color-adjust:exact`, `page-break-inside:avoid`,
Türkçe karakter güvenli fontlar, Google Fonts `<link>` (Playwright `networkidle` bekler,
sistem fallback'leri var).

### 5.3 Render motoru (`lib/presentation.ts` → `renderHtml`)

İmza genişler (geriye uyumlu, opsiyonel parametrelerle):

```ts
renderHtml(input: {
  firmName: string;
  sections: SectionConfig[];
  content: Record<string, string>;
  themeId?: string | null;
  branding?: Branding;      // logo, agencyName, website, contact, brandColor
}): string
```

- Tema = `getTheme(themeId)`; accent = `branding.brandColor ?? #17913a`.
- `<head>` içine temanın `fonts` linki + `theme.css(accent)` gömülür.
- Logo (varsa) kapakta marka satırında ve altbilgide `<img src="{data-uri}">` olarak.
- Ajans adı → kapak/altbilgi (yoksa "DamgaPanel" yerine boş/ajans adı).
- İletişim (telefon/e-posta/web/adres) → "Sonraki adım" bölümü altında ve kapanış künyesinde.
- `renderBody`, `escapeHtml` korunur.
- İskelet, mevcut yapıyı korur; tema CSS'i görünümü belirler. Gerekirse `layout` bayrağıyla
  küçük iskelet farkları (ör. cesur temada kapak blok düzeni).

## 6. Marka & ayar API'si

`lib/branding.ts`:
- `getBranding(): Promise<Branding>` — singleton satırı okur; yoksa varsayılanlarla döner.
- `saveBranding(patch): Promise<Branding>` — upsert.

`app/api/settings/branding/route.ts`:
- `GET` → mevcut marka + tema listesi (id, ad, açıklama).
- `PATCH` → alanları günceller (logo base64 dahil). Logo boyut sınırı: **~1.2MB** (data-URI
  uzunluğu ~1.6M char). Aşarsa 413 + Türkçe hata. İçerik türü PNG/JPG/SVG/WebP kabul.

## 7. Ayarlar sayfası — `/ayarlar/sunum` (ayrı sayfa)

- Yeni rota `app/(panel)/ayarlar/sunum/page.tsx` (server) → veriyi çekip client bileşene verir.
- `/ayarlar` sayfasına ve panel navigasyonuna "Sunum Markası" linki eklenir.
- Client bileşen `components/settings/branding-settings.tsx`:
  - **Ajans kimliği formu:** logo yükle (dosya seç/sürükle → `FileReader` ile base64; önizleme
    kutucuğu; kaldır), ajans adı, web sitesi, telefon, e-posta, adres, **marka rengi** (renk
    seçici + hex input, varsayılan `#17913a`).
  - **Tema galerisi:** `THEME_LIST` üzerinden 6 kart. Her kart, `/sunum/onizleme?theme=<id>`
    rotasını gösteren küçük ölçekli bir `<iframe>` (ör. `transform: scale(.28)`), tema adı,
    açıklama ve "Varsayılan yap" butonu; seçili tema işaretli (marka rengi çerçeve).
  - Kaydet → `PATCH /api/settings/branding`. Başarı/başarısızlık mesajı.

## 8. Önizleme mekanizması

- Yeni rota `app/sunum/onizleme/route.ts` (`GET`):
  - `?theme=<id>` (yoksa global varsayılan) alır.
  - **Örnek yer-tutucu içerik** (sabit, temsili firma "Kardeşler Mobilya" + tüm bölümler) +
    kaydedilmiş marka ile `renderHtml` çağırır.
  - `text/html` döner. Firma/DB kaydı gerektirmez → hızlı, ücretsiz.
- Mevcut `app/sunum/[id]/route.ts` (gerçek sunum linki): `?theme=<id>` query'sini kabul eder
  (yoksa `presentation.themeId ?? global`). Böylece editörden "Önizle" seçili temayla açılır.

## 9. Sunum editörü entegrasyonu (`components/firma/sunum-editor.tsx`)

- Üst araç çubuğuna **tema seçici** (dropdown, `THEME_LIST`). Değer `pres.themeId ?? global`.
- Tema değişince `PATCH /api/presentations/[id]` ile `themeId` kaydedilir (mevcut PATCH
  genişletilir).
- "Önizle" → `/sunum/[id]?theme=<seçili>` yeni sekmede.
- "PDF indir" ve "Mesajı kopyala" akışı aynı; PDF rotası `themeId` + marka kullanır.
- `Presentation` tipine `themeId` eklenir; `page.tsx` (`app/(panel)/firma/[id]/sunum/page.tsx`)
  global varsayılan tema id'sini bileşene geçirir.

## 10. PDF rotası (`app/api/presentations/[id]/pdf/route.ts`)

`renderHtml`'e `themeId` (presentation'dan) + `branding` (getBranding) geçirilir. Gerisi aynı.

## 11. Dosya bazında değişiklik listesi

Yeni:
- `lib/presentation/brand.ts` (palet sabitleri)
- `lib/presentation/themes.ts` (6 tema + registry)
- `lib/branding.ts` (get/save singleton)
- `app/api/settings/branding/route.ts`
- `app/(panel)/ayarlar/sunum/page.tsx`
- `components/settings/branding-settings.tsx`
- `app/sunum/onizleme/route.ts`
- `prisma/migrations/*` (yeni migration)

Değişecek:
- `prisma/schema.prisma` (PresentationTemplate + Presentation alanları)
- `lib/presentation.ts` (`renderHtml` tema+marka; varsayılan renk yeşil)
- `app/api/presentations/[id]/pdf/route.ts`
- `app/api/presentations/[id]/route.ts` (PATCH → themeId)
- `app/sunum/[id]/route.ts` (?theme override)
- `components/firma/sunum-editor.tsx` (tema seçici)
- `app/(panel)/firma/[id]/sunum/page.tsx` (global tema geçir)
- `/ayarlar` sayfası + panel nav (link)

## 12. Doğrulama

Projede test çatısı yok. Doğrulama, geçici bir `tsx` render scriptiyle yapılır:

1. **6 temanın her biri** örnek içerik + örnek marka (logo dahil) ile PDF'e basılır; kapak +
   içerik + logo + iletişim + marka rengi gözle kontrol edilir (bugünkü yöntem).
2. `/sunum/onizleme?theme=<id>` her tema için 200 + geçerli HTML döner.
3. Marka rengi override'ı bir temada uygulanıp aksanın değiştiği doğrulanır.
4. Logo boyut sınırı aşımında 413 döndüğü kontrol edilir.
5. `npm run build` / `next lint` temiz.

## 13. Açık soru

Yok. Kararlar: 6 tema, global+sunum-başına seçim, logo base64, tüm marka alanları, ayrı ayar
sayfası, DamgaBilişim yeşili varsayılan.
