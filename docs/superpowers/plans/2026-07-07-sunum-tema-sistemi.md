# Sunum Tema & Marka Sistemi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sunum çıktısını 6 markalı tema + ajans kimliği (logo/ad/iletişim/renk) + anlık önizleme ile markalanabilir, çok temalı bir sisteme çevirmek.

**Architecture:** Tek ortak iskelet CSS'i (`BASE_CSS`) CSS değişkenleriyle sürülür; her tema yalnızca `fontsHref` + değişken haritası (`vars`) + küçük `extraCss` sağlar (DRY). Marka bilgisi tekil `PresentationTemplate` satırında (logo base64) tutulur; `renderHtml(input)` artık `themeId` + `branding` alır. Tema seçimi global varsayılan (`PresentationTemplate.defaultThemeId`) + sunum başına override (`Presentation.themeId`).

**Tech Stack:** Next.js 16 (App Router), Prisma 7 (postgres), Playwright (HTML→PDF), React 19, Tailwind v4, tsx (doğrulama scriptleri). Not: birim test çatısı yok — doğrulama tsx scriptleri + `npx tsc --noEmit` + render kontrolü ile.

**Not (test yaklaşımı):** Saf mantık (getTheme fallback, logo boyut guard, branding upsert) küçük `tsx` assert scriptleriyle doğrulanır. Render çıktısı `scripts/preview-themes.mts` ile PDF'e basılıp gözle onaylanır. Her task sonunda commit.

---

## Dosya yapısı

Yeni:
- `lib/presentation/brand.ts` — marka paleti sabitleri (tek sorumluluk: renk/varsayılan sabitleri)
- `lib/presentation/themes.ts` — Theme tipi, BASE_CSS, 6 tema haritası, registry, `getTheme`
- `lib/branding.ts` — tekil marka satırı get/save + `Branding` tipi + logo doğrulama
- `app/api/settings/branding/route.ts` — GET/PATCH marka
- `app/(panel)/ayarlar/sunum/page.tsx` — server sayfa (marka + tema listesi çeker)
- `components/settings/branding-settings.tsx` — client form + tema galerisi
- `app/sunum/onizleme/route.ts` — örnek içerikle tema önizleme (DB gerekmez)
- `scripts/preview-themes.mts` — 6 temayı PDF'e basan doğrulama scripti

Değişecek:
- `prisma/schema.prisma` — `PresentationTemplate` + `Presentation.themeId`
- `lib/presentation.ts` — `renderHtml` tema+marka; iskelet themes.ts'e taşınır
- `app/api/presentations/[id]/pdf/route.ts` — themeId + branding geçir
- `app/api/presentations/[id]/route.ts` — PATCH `themeId` kabul
- `app/sunum/[id]/route.ts` — `?theme` override + branding
- `components/firma/sunum-editor.tsx` — tema seçici
- `app/(panel)/firma/[id]/sunum/page.tsx` — global tema id + themeId geçir
- `app/(panel)/ayarlar/page.tsx` — "Sunum Markası" linki

---

## Task 1: Marka paleti sabitleri

**Files:**
- Create: `lib/presentation/brand.ts`

- [ ] **Step 1: Sabitleri yaz**

```ts
// lib/presentation/brand.ts
// DamgaBilişim marka paleti (damgabilisim.com'dan çıkarıldı).
export const BRAND = {
  green700: "#17913a", // ana / varsayılan marka rengi
  green600: "#22a83f",
  green: "#2fbf4b",
  lime: "#7ed957", // aksan
  ink: "#16261b", // başlık / koyu zemin
  ink2: "#17211b",
  body: "#33463b",
  muted: "#6d7d74",
  cream: "#f4faf5",
  mint: "#d8f6e0",
  mint2: "#eafaef",
  line: "rgba(23,145,58,.14)",
} as const;

export const DEFAULT_BRAND_COLOR = BRAND.green700;
```

- [ ] **Step 2: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: PASS (hata yok)

- [ ] **Step 3: Commit**

```bash
git add lib/presentation/brand.ts
git commit -m "feat(sunum): marka paleti sabitleri"
```

---

## Task 2: Tema sistemi (BASE_CSS + 6 tema + registry)

**Files:**
- Create: `lib/presentation/themes.ts`

- [ ] **Step 1: Tip + BASE_CSS + ortak SVG'ler**

```ts
// lib/presentation/themes.ts
import { BRAND, DEFAULT_BRAND_COLOR } from "./brand";

export type ThemeId =
  | "orman-koyu" | "nane" | "kurumsal-yesil"
  | "cesur" | "sicak-butik" | "teknoloji";

export type Theme = {
  id: ThemeId;
  name: string;
  description: string;
  fontsHref: string; // Google Fonts <link href>
  vars: Record<string, string>; // :root değişkenleri (accent hariç)
  extraCss?: string;
};

export const DEFAULT_THEME_ID: ThemeId = "nane";

// beyaz tik ikonu (li::before için) — data-URI
const CHECK =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='17' height='17' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'/%3E%3C/svg%3E\")";
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// Ortak iskelet — tüm görünüm CSS değişkenlerinden gelir.
export const BASE_CSS = `
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:var(--sans);color:var(--body);background:#fff;line-height:1.6;font-size:15px;-webkit-print-color-adjust:exact;print-color-adjust:exact;-webkit-font-smoothing:antialiased}
h1,h2{font-family:var(--display);color:var(--ink);letter-spacing:-.015em;font-weight:var(--head-weight,600)}
@page{size:A4;margin:0}

.cover{position:relative;height:297mm;width:210mm;overflow:hidden;color:var(--cover-fg);padding:24mm 22mm;display:flex;flex-direction:column;justify-content:space-between;background:var(--cover-bg);page-break-after:always}
.cover-noise{position:absolute;inset:0;opacity:var(--noise-op,0);pointer-events:none;mix-blend-mode:overlay;background-image:${NOISE}}
.cover>*{position:relative;z-index:1}
.cover-top{display:flex;justify-content:space-between;align-items:center;padding-bottom:16px;border-bottom:1px solid var(--cover-line)}
.brand-mark{display:inline-flex;align-items:center;gap:9px;font-weight:800;font-size:15px;color:var(--cover-fg)}
.brand-mark img{height:26px;width:auto;display:block}
.mark-dot{width:9px;height:9px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 28%,transparent)}
.eyebrow{font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--cover-muted)}
.cover-main{margin-top:auto;margin-bottom:auto}
.cover-kicker{display:inline-block;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);font-weight:700;margin-bottom:18px;padding:6px 12px;border-radius:100px;background:color-mix(in srgb,var(--accent) 16%,transparent);border:1px solid color-mix(in srgb,var(--accent) 34%,transparent)}
.cover-main h1{font-size:clamp(44px,8.4vw,74px);line-height:1.02;margin:0;color:var(--cover-head);font-weight:var(--cover-head-weight,600)}
.cover-main .lead{margin-top:26px;max-width:80%}
.cover-main .lead p{font-family:var(--lead-font);font-style:var(--lead-style,italic);font-weight:500;font-size:22px;line-height:1.42;color:var(--cover-lead);margin:0 0 8px}
.cover-foot{display:flex;justify-content:space-between;align-items:flex-end;padding-top:16px;border-top:1px solid var(--cover-line)}
.cover-foot-item{display:flex;flex-direction:column;gap:3px}
.cover-foot-item--r{text-align:right}
.cfl{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--cover-muted)}
.cfv{font-size:13px;color:var(--cover-fg);font-weight:600}

.content{padding:22mm 22mm 8mm;background:var(--paper)}
.sec{margin:0 0 30px;padding-bottom:30px;border-bottom:1px solid var(--line);page-break-inside:avoid}
.sec:last-child{border-bottom:0}
.s-head{display:flex;align-items:flex-start;gap:18px;margin-bottom:14px}
.s-no{font-family:var(--display);font-weight:600;font-size:34px;line-height:1;color:var(--accent);min-width:52px}
.s-eyebrow{display:block;font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);font-weight:700;margin-bottom:5px}
.s-head-txt{padding-top:2px}
h2{font-size:25px;margin:0;line-height:1.14}
.s-body{padding-left:70px}
.s-body p{margin:0 0 11px;color:var(--body)}
.s-body p:last-child{margin-bottom:0}
.s-body ul{margin:14px 0 4px;padding:0;list-style:none;display:grid;gap:9px}
.s-body li{position:relative;padding:11px 14px 11px 42px;margin:0;background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);color:var(--ink);font-weight:500}
.s-body li::before{content:"";position:absolute;left:13px;top:13px;width:17px;height:17px;border-radius:50%;background:var(--accent);background-image:${CHECK};background-repeat:no-repeat;background-position:center}

.sec--cta{border-bottom:0;padding:26px 28px;border-radius:calc(var(--radius) + 4px);background:radial-gradient(120% 100% at 100% 0%,color-mix(in srgb,var(--accent) 12%,transparent),transparent 60%),var(--cta-bg);border:1px solid color-mix(in srgb,var(--accent) 24%,transparent)}
.sec--cta .s-body li{background:#fff}
.cta-contact{margin-top:16px;padding-left:70px;display:flex;flex-wrap:wrap;gap:8px 18px;font-size:13px;color:var(--body)}
.cta-contact span{display:inline-flex;align-items:center;gap:6px}
.cta-contact .cl{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);font-weight:700}

.signoff{text-align:center;padding:6mm 22mm 20mm;color:var(--muted);background:var(--paper)}
.signoff-rule{width:44px;height:2px;background:var(--accent);margin:0 auto 14px;border-radius:2px}
.signoff img{height:26px;margin:0 auto 10px;display:block}
.signoff .brand{font-family:var(--display);font-size:17px;color:var(--ink);font-weight:600}
.signoff .meta{font-size:11.5px;letter-spacing:.04em;margin-top:5px}
`;
```

- [ ] **Step 2: 6 tema haritası + registry + getTheme**

```ts
// lib/presentation/themes.ts (devam — dosyanın sonuna ekle)

const JAKARTA =
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";

export const THEMES: Record<ThemeId, Theme> = {
  "orman-koyu": {
    id: "orman-koyu",
    name: "Orman Koyu",
    description: "Koyu orman yeşili kapak, krem içerik, zarif serif başlıklar.",
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
    vars: {
      "--sans": "'Plus Jakarta Sans','Segoe UI',sans-serif",
      "--display": "'Fraunces',Georgia,serif",
      "--lead-font": "'Fraunces',Georgia,serif",
      "--lead-style": "italic",
      "--ink": BRAND.ink,
      "--body": BRAND.body,
      "--muted": BRAND.muted,
      "--line": BRAND.line,
      "--paper": "#fff",
      "--panel": BRAND.cream,
      "--radius": "11px",
      "--cover-bg":
        "radial-gradient(90% 60% at 108% -6%, color-mix(in srgb, var(--accent) 55%, transparent), transparent 58%), radial-gradient(80% 55% at -12% 112%, color-mix(in srgb, var(--accent) 24%, transparent), transparent 60%), linear-gradient(155deg,#1f2a20 0%," + BRAND.ink + " 46%,#0e1510 100%)",
      "--cover-fg": "#eef6ee",
      "--cover-head": "#fff",
      "--cover-lead": "rgba(238,246,238,.9)",
      "--cover-line": "rgba(238,246,238,.14)",
      "--cover-muted": "rgba(238,246,238,.6)",
      "--cta-bg": BRAND.cream,
      "--noise-op": ".05",
    },
  },
  nane: {
    id: "nane",
    name: "Nane",
    description: "Beyaz + nane gradyan, yuvarlak kartlar, modern sans. Marka dili.",
    fontsHref: JAKARTA,
    vars: {
      "--sans": "'Plus Jakarta Sans','Segoe UI',sans-serif",
      "--display": "'Plus Jakarta Sans','Segoe UI',sans-serif",
      "--lead-font": "'Plus Jakarta Sans',sans-serif",
      "--lead-style": "normal",
      "--head-weight": "700",
      "--cover-head-weight": "800",
      "--ink": BRAND.ink,
      "--body": BRAND.body,
      "--muted": BRAND.muted,
      "--line": BRAND.line,
      "--paper": "#fff",
      "--panel": BRAND.mint2,
      "--radius": "18px",
      "--cover-bg":
        "radial-gradient(80% 60% at 100% 0%," + BRAND.mint + ",transparent 60%),radial-gradient(70% 50% at 0% 100%," + BRAND.mint2 + ",transparent 60%),#fff",
      "--cover-fg": BRAND.body,
      "--cover-head": BRAND.ink,
      "--cover-lead": BRAND.body,
      "--cover-line": BRAND.line,
      "--cover-muted": BRAND.muted,
      "--cta-bg": BRAND.mint2,
      "--noise-op": "0",
    },
  },
  "kurumsal-yesil": {
    id: "kurumsal-yesil",
    name: "Kurumsal Yeşil",
    description: "Koyu yeşil + gri, sakin ve ciddi; güven veren kurumsal ton.",
    fontsHref:
      "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Serif:wght@500;600&display=swap",
    vars: {
      "--sans": "'IBM Plex Sans','Segoe UI',sans-serif",
      "--display": "'IBM Plex Serif',Georgia,serif",
      "--lead-font": "'IBM Plex Serif',Georgia,serif",
      "--lead-style": "normal",
      "--ink": "#1b2a24",
      "--body": "#3c4a44",
      "--muted": "#7c8781",
      "--line": "#e3e8e5",
      "--paper": "#fff",
      "--panel": "#f4f6f5",
      "--radius": "8px",
      "--cover-bg": "linear-gradient(160deg,#14231b,#0f1a14)",
      "--cover-fg": "#dce6e0",
      "--cover-head": "#fff",
      "--cover-lead": "rgba(220,230,224,.85)",
      "--cover-line": "rgba(220,230,224,.16)",
      "--cover-muted": "rgba(220,230,224,.55)",
      "--cta-bg": "#f4f6f5",
      "--noise-op": "0",
    },
  },
  cesur: {
    id: "cesur",
    name: "Cesur",
    description: "Dev başlıklar, lime/parlak yeşil vurgu, yüksek kontrast hero tarzı.",
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;800;900&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap",
    vars: {
      "--sans": "'Plus Jakarta Sans','Segoe UI',sans-serif",
      "--display": "'Archivo','Segoe UI',sans-serif",
      "--lead-font": "'Plus Jakarta Sans',sans-serif",
      "--lead-style": "normal",
      "--head-weight": "800",
      "--cover-head-weight": "900",
      "--ink": BRAND.ink,
      "--body": BRAND.body,
      "--muted": BRAND.muted,
      "--line": BRAND.line,
      "--paper": "#fff",
      "--panel": BRAND.cream,
      "--radius": "16px",
      "--cover-bg": "linear-gradient(135deg," + BRAND.green700 + " 0%," + BRAND.green600 + " 55%," + BRAND.lime + " 130%)",
      "--cover-fg": "#f2fff4",
      "--cover-head": "#fff",
      "--cover-lead": "rgba(242,255,244,.92)",
      "--cover-line": "rgba(242,255,244,.24)",
      "--cover-muted": "rgba(242,255,244,.7)",
      "--cta-bg": BRAND.cream,
      "--noise-op": "0",
    },
    extraCss:
      ".cover-main h1{font-size:clamp(50px,10vw,88px);letter-spacing:-.03em;text-transform:uppercase}.cover-kicker{background:#fff;color:" + BRAND.green700 + ";border-color:#fff}",
  },
  "sicak-butik": {
    id: "sicak-butik",
    name: "Sıcak / Butik",
    description: "Krem zemin, yumuşak yeşil, Caveat el yazısı dokunuşlar; samimi.",
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Nunito:wght@400;600;700&family=Caveat:wght@600&display=swap",
    vars: {
      "--sans": "'Nunito','Segoe UI',sans-serif",
      "--display": "'Fraunces',Georgia,serif",
      "--lead-font": "'Caveat',cursive",
      "--lead-style": "normal",
      "--ink": "#2a2018",
      "--body": "#5a4d40",
      "--muted": "#9a8b7c",
      "--line": "#ece2d4",
      "--paper": BRAND.cream,
      "--panel": "#fff",
      "--radius": "22px",
      "--cover-bg":
        "radial-gradient(80% 60% at 100% 0%," + BRAND.mint + ",transparent 60%),linear-gradient(180deg,#fbf7ef,#f4faf5)",
      "--cover-fg": "#5a4d40",
      "--cover-head": "#2a2018",
      "--cover-lead": BRAND.green700,
      "--cover-line": "rgba(90,77,64,.16)",
      "--cover-muted": "#9a8b7c",
      "--cta-bg": "#fff",
      "--noise-op": "0",
    },
    extraCss: ".cover-main .lead p{font-size:30px;line-height:1.2}",
  },
  teknoloji: {
    id: "teknoloji",
    name: "Teknoloji",
    description: "Koyu orman zemin, ince çizgi, parlak yeşil neon aksan, mono detay.",
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap",
    vars: {
      "--sans": "'Sora','Segoe UI',sans-serif",
      "--display": "'Sora','Segoe UI',sans-serif",
      "--lead-font": "'JetBrains Mono',monospace",
      "--lead-style": "normal",
      "--head-weight": "700",
      "--ink": "#e7f3ea",
      "--body": "#aab8ae",
      "--muted": "#6f7d73",
      "--line": "rgba(47,191,75,.18)",
      "--paper": "#0f1613",
      "--panel": "#161f1a",
      "--radius": "10px",
      "--cover-bg": "radial-gradient(70% 50% at 100% 0%,color-mix(in srgb,var(--accent) 30%,transparent),transparent 60%),#0c1310",
      "--cover-fg": "#cfe8d5",
      "--cover-head": "#fff",
      "--cover-lead": BRAND.green,
      "--cover-line": "rgba(207,232,213,.14)",
      "--cover-muted": "rgba(207,232,213,.5)",
      "--cta-bg": "#161f1a",
      "--noise-op": "0",
    },
    extraCss:
      ".s-eyebrow,.cover-main .lead p{font-family:'JetBrains Mono',monospace}.sec--cta .s-body li{background:#0f1613}",
  },
};

export const THEME_LIST: Theme[] = [
  THEMES["nane"],
  THEMES["orman-koyu"],
  THEMES["kurumsal-yesil"],
  THEMES["cesur"],
  THEMES["sicak-butik"],
  THEMES["teknoloji"],
];

export function getTheme(id?: string | null): Theme {
  return (id && (THEMES as Record<string, Theme>)[id]) || THEMES[DEFAULT_THEME_ID];
}

// Tema + marka rengi → <head>'e girecek stil (fontlar + :root + base + extra).
export function themeHead(theme: Theme, accent: string): string {
  const rootVars = Object.entries(theme.vars)
    .map(([k, v]) => `${k}:${v};`)
    .join("");
  return `<link href="${theme.fontsHref}" rel="stylesheet">
<style>:root{--accent:${accent};${rootVars}}${BASE_CSS}${theme.extraCss ?? ""}</style>`;
}

export { DEFAULT_BRAND_COLOR };
```

- [ ] **Step 3: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: getTheme fallback doğrulaması**

`scripts/check-themes.mts` oluştur:

```ts
import { getTheme, THEME_LIST, DEFAULT_THEME_ID, themeHead } from "../lib/presentation/themes";
import assert from "node:assert";

assert.equal(getTheme(undefined).id, DEFAULT_THEME_ID, "boş id → varsayılan");
assert.equal(getTheme("yok-boyle-tema").id, DEFAULT_THEME_ID, "bilinmeyen id → varsayılan");
assert.equal(getTheme("cesur").id, "cesur", "geçerli id korunur");
assert.equal(THEME_LIST.length, 6, "6 tema olmalı");
for (const t of THEME_LIST) {
  const head = themeHead(t, "#17913a");
  assert.ok(head.includes("--accent:#17913a"), t.id + ": accent gömülü");
  assert.ok(head.includes(t.fontsHref), t.id + ": font linki gömülü");
}
console.log("check-themes OK");
```

Run: `npx tsx scripts/check-themes.mts`
Expected: `check-themes OK`

- [ ] **Step 5: Commit**

```bash
git add lib/presentation/themes.ts scripts/check-themes.mts
git commit -m "feat(sunum): 6 tema + ortak iskelet CSS + registry"
```

---

## Task 3: renderHtml'i tema + marka ile yeniden yaz

**Files:**
- Modify: `lib/presentation.ts`

- [ ] **Step 1: `Branding` tipini ve importları ekle** (dosya başındaki importların altına)

```ts
import { getTheme, themeHead } from "./presentation/themes";
import { DEFAULT_BRAND_COLOR } from "./presentation/brand";

export type Branding = {
  logoUrl?: string | null;
  agencyName?: string | null;
  website?: string | null;
  brandColor?: string | null;
  contact?: { phone?: string | null; email?: string | null; address?: string | null } | null;
};
```

- [ ] **Step 2: `renderHtml`'i tamamen değiştir**

Mevcut `renderHtml` fonksiyonunu (imza + gövde + döndürülen HTML) şu sürümle değiştir:

```ts
export function renderHtml(input: {
  firmName: string;
  sections: SectionConfig[];
  content: Record<string, string>;
  themeId?: string | null;
  branding?: Branding;
}): string {
  const b = input.branding ?? {};
  const accent = b.brandColor || DEFAULT_BRAND_COLOR;
  const theme = getTheme(input.themeId);
  const agency = (b.agencyName && b.agencyName.trim()) || "DamgaPanel";
  const enabled = input.sections.filter((s) => s.enabled && input.content[s.key]);
  const kapak = enabled.find((s) => s.key === "kapak");
  const rest = enabled.filter((s) => s.key !== "kapak");
  const tarih = new Date().toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" });
  const yil = new Date().getFullYear();

  const logoMark = b.logoUrl
    ? `<img src="${b.logoUrl}" alt="${escapeHtml(agency)}">`
    : `<span class="mark-dot"></span>${escapeHtml(agency)}`;

  const cover = `
    <div class="cover">
      <div class="cover-noise"></div>
      <div class="cover-top">
        <span class="brand-mark">${logoMark}</span>
        <span class="eyebrow">Dijital Görünürlük Değerlendirmesi</span>
      </div>
      <div class="cover-main">
        <span class="cover-kicker">Firmanıza özel hazırlanmış brifing</span>
        <h1>${escapeHtml(input.firmName)}</h1>
        ${kapak ? `<div class="lead">${renderBody(input.content["kapak"])}</div>` : ""}
      </div>
      <div class="cover-foot">
        <div class="cover-foot-item"><span class="cfl">Tarih</span><span class="cfv">${tarih}</span></div>
        <div class="cover-foot-item cover-foot-item--r"><span class="cfl">Hazırlayan</span><span class="cfv">${escapeHtml(agency)}</span></div>
      </div>
    </div>`;

  const contact = b.contact ?? {};
  const contactBits: string[] = [];
  if (contact.phone) contactBits.push(`<span><span class="cl">Tel</span> ${escapeHtml(contact.phone)}</span>`);
  if (contact.email) contactBits.push(`<span><span class="cl">E-posta</span> ${escapeHtml(contact.email)}</span>`);
  if (b.website) contactBits.push(`<span><span class="cl">Web</span> ${escapeHtml(b.website)}</span>`);
  if (contact.address) contactBits.push(`<span><span class="cl">Adres</span> ${escapeHtml(contact.address)}</span>`);
  const contactRow = contactBits.length ? `<div class="cta-contact">${contactBits.join("")}</div>` : "";

  const total = rest.length;
  const body = rest
    .map((s, i) => {
      const no = String(i + 1).padStart(2, "0");
      const isCta = s.key === "cta";
      return `
    <section class="sec${isCta ? " sec--cta" : ""}">
      <div class="s-head">
        <span class="s-no">${no}</span>
        <div class="s-head-txt">
          <span class="s-eyebrow">Bölüm ${no} / ${String(total).padStart(2, "0")}</span>
          <h2>${escapeHtml(s.title)}</h2>
        </div>
      </div>
      <div class="s-body">${renderBody(input.content[s.key])}</div>
      ${isCta ? contactRow : ""}
    </section>`;
    })
    .join("");

  const signoffLogo = b.logoUrl ? `<img src="${b.logoUrl}" alt="${escapeHtml(agency)}">` : "";

  return `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(input.firmName)} — Dijital Görünürlük Değerlendirmesi</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${themeHead(theme, accent)}
</head><body>
${cover}
<div class="content">
${body}
</div>
<div class="signoff">
  <div class="signoff-rule"></div>
  ${signoffLogo}
  <div class="brand">${escapeHtml(agency)}</div>
  <div class="meta">${escapeHtml(input.firmName)} için hazırlanmıştır · ${tarih} · © ${yil}</div>
</div>
</body></html>`;
}
```

> Not: Eski `<style>` bloğu ve eski `brandColor` parametresi kaldırılır; görünüm artık `themeHead` ile gelir. `renderBody` ve `escapeHtml` aynen kalır.

- [ ] **Step 3: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: PASS (pdf/route.ts ve sunum/[id]/route.ts çağrıları henüz eski imzada olabilir — bu tasklar 5 ve 6'da düzeltilecek; şimdilik `brandColor` geçen çağrı yoksa hata olmaz. Eğer eski çağrılar hata verirse Task 5–6'daki düzenlemelerle giderilecek — bu adımda yalnızca presentation.ts'in kendi içi derlenmeli.)

- [ ] **Step 4: Commit**

```bash
git add lib/presentation.ts
git commit -m "feat(sunum): renderHtml tema + marka (logo/iletisim/renk) destegi"
```

---

## Task 4: Marka verisi katmanı + API

**Files:**
- Create: `lib/branding.ts`
- Create: `app/api/settings/branding/route.ts`

- [ ] **Step 1: `lib/branding.ts` yaz**

```ts
// lib/branding.ts — tekil ajans marka satırı (PresentationTemplate) get/save.
import { prisma } from "@/lib/prisma";
import { DEFAULT_BRAND_COLOR } from "@/lib/presentation/brand";
import { DEFAULT_THEME_ID } from "@/lib/presentation/themes";
import type { Branding } from "@/lib/presentation";
import { DEFAULT_SECTIONS } from "@/lib/presentation";

const SINGLETON = "singleton";
export const MAX_LOGO_CHARS = 1_600_000; // ~1.2MB base64

export type BrandingRecord = Branding & { defaultThemeId: string };

export async function getBranding(): Promise<BrandingRecord> {
  const row = await prisma.presentationTemplate.findUnique({ where: { id: SINGLETON } });
  const contact = (row?.contact as BrandingRecord["contact"]) ?? {};
  return {
    logoUrl: row?.logoUrl ?? null,
    agencyName: row?.agencyName ?? null,
    website: row?.website ?? null,
    brandColor: row?.brandColor ?? DEFAULT_BRAND_COLOR,
    contact,
    defaultThemeId: row?.defaultThemeId ?? DEFAULT_THEME_ID,
  };
}

export type BrandingPatch = Partial<{
  logoUrl: string | null;
  agencyName: string | null;
  website: string | null;
  brandColor: string | null;
  defaultThemeId: string | null;
  contact: { phone?: string | null; email?: string | null; address?: string | null };
}>;

export async function saveBranding(patch: BrandingPatch): Promise<BrandingRecord> {
  await prisma.presentationTemplate.upsert({
    where: { id: SINGLETON },
    create: {
      id: SINGLETON,
      defaultSections: DEFAULT_SECTIONS as unknown as object,
      logoUrl: patch.logoUrl ?? null,
      agencyName: patch.agencyName ?? null,
      website: patch.website ?? null,
      brandColor: patch.brandColor ?? DEFAULT_BRAND_COLOR,
      defaultThemeId: patch.defaultThemeId ?? DEFAULT_THEME_ID,
      contact: (patch.contact ?? {}) as object,
    },
    update: {
      ...(patch.logoUrl !== undefined ? { logoUrl: patch.logoUrl } : {}),
      ...(patch.agencyName !== undefined ? { agencyName: patch.agencyName } : {}),
      ...(patch.website !== undefined ? { website: patch.website } : {}),
      ...(patch.brandColor !== undefined ? { brandColor: patch.brandColor } : {}),
      ...(patch.defaultThemeId !== undefined ? { defaultThemeId: patch.defaultThemeId } : {}),
      ...(patch.contact !== undefined ? { contact: patch.contact as object } : {}),
    },
  });
  return getBranding();
}

// Logo data-URI doğrulama: tür + boyut. Geçerliyse null, değilse hata mesajı.
export function validateLogo(dataUri: string): string | null {
  if (!/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/.test(dataUri))
    return "Logo PNG, JPG, WebP veya SVG olmalı.";
  if (dataUri.length > MAX_LOGO_CHARS) return "Logo çok büyük (en fazla ~1.2MB).";
  return null;
}
```

- [ ] **Step 2: API route yaz**

```ts
// app/api/settings/branding/route.ts
import { NextResponse } from "next/server";
import { getBranding, saveBranding, validateLogo, type BrandingPatch } from "@/lib/branding";
import { THEME_LIST } from "@/lib/presentation/themes";

export const dynamic = "force-dynamic";

export async function GET() {
  const branding = await getBranding();
  const themes = THEME_LIST.map((t) => ({ id: t.id, name: t.name, description: t.description }));
  return NextResponse.json({ branding, themes });
}

export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => null)) as BrandingPatch | null;
  if (!body) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  if (typeof body.logoUrl === "string" && body.logoUrl) {
    const err = validateLogo(body.logoUrl);
    if (err) return NextResponse.json({ error: err }, { status: 413 });
  }
  const branding = await saveBranding(body);
  return NextResponse.json({ branding });
}
```

- [ ] **Step 3: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: PASS (not: `prisma.presentationTemplate` yeni alanları Task 7'de migration + generate sonrası tam tanınır; bu task ile Task 7 sırası önemli — bkz. Task 7 önce migration üretir. Eğer bu adımda alan tipi hatası çıkarsa Task 7'yi bundan önce çalıştır.)

- [ ] **Step 4: Commit**

```bash
git add lib/branding.ts app/api/settings/branding/route.ts
git commit -m "feat(sunum): marka verisi katmani + /api/settings/branding"
```

---

## Task 5: Prisma şeması + migration

> Sıra notu: Prisma tip hataları önlemek için bu task, Task 4/6/7/8'in `npx tsc --noEmit` adımlarından ÖNCE çalıştırılabilir. Bağımsız olduğundan buraya konumlandırıldı; executor tip hatası görürse bu task'i öne alır.

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: `PresentationTemplate` modeline alan ekle**

`prisma/schema.prisma` içinde `PresentationTemplate` modelini şu hale getir (mevcut alanların yanına 3 satır ekle):

```prisma
model PresentationTemplate {
  id              String             @id @default(cuid())
  defaultFormat   PresentationFormat @default(HTML)
  defaultSections Json
  logoUrl         String?
  brandColor      String?
  agencyName      String?
  website         String?
  defaultThemeId  String?
  contact         Json?
  updatedAt       DateTime           @updatedAt
}
```

- [ ] **Step 2: `Presentation` modeline `themeId` ekle**

`Presentation` modelinde `content` satırının altına ekle:

```prisma
  themeId       String?
```

- [ ] **Step 3: Migration üret + client generate**

Run: `npx prisma migrate dev --name sunum_tema_marka`
Expected: yeni migration klasörü oluşur, `prisma generate` otomatik çalışır, hata yok.

> Ortamda DB yoksa: `npx prisma migrate dev` başarısız olur. O durumda executor `.env` DATABASE_URL'i doğrular; yine de generate için `npx prisma generate` çalıştırılır ve migration SQL'i elle `prisma/migrations/` altına eklenir. Beklenen normal akış migrate dev'in çalışmasıdır.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(sunum): PresentationTemplate marka alanlari + Presentation.themeId"
```

---

## Task 6: PDF rotası + Presentation PATCH (themeId)

**Files:**
- Modify: `app/api/presentations/[id]/pdf/route.ts`
- Modify: `app/api/presentations/[id]/route.ts`
- Modify: `app/sunum/[id]/route.ts`

- [ ] **Step 1: PDF rotasını güncelle**

`app/api/presentations/[id]/pdf/route.ts` içinde `renderHtml` çağrısını değiştir:

```ts
import { getBranding } from "@/lib/branding";
// ... POST içinde presentation çekildikten sonra:
  const branding = await getBranding();
  const html = renderHtml({
    firmName: presentation.business.name,
    sections: presentation.sectionConfig as unknown as SectionConfig[],
    content: presentation.content as Record<string, string>,
    themeId: presentation.themeId,
    branding,
  });
```

- [ ] **Step 2: Presentation PATCH'e themeId ekle**

`app/api/presentations/[id]/route.ts` PATCH handler'ında body'den `themeId` de al ve update'e ekle. Mevcut PATCH gövdesindeki `data`'ya koşullu ekleme yap:

```ts
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.sectionConfig !== undefined) data.sectionConfig = body.sectionConfig;
  if (body.content !== undefined) data.content = body.content;
  if (body.themeId !== undefined) data.themeId = body.themeId;
  const updated = await prisma.presentation.update({ where: { id }, data });
```

> Executor mevcut PATCH gövdesini okur ve yalnızca `themeId` satırını + data yapısını bu kalıba uyarlar; diğer alanları bozmadan.

- [ ] **Step 3: Genel sunum linkine tema override + marka ekle**

`app/sunum/[id]/route.ts` GET içinde:

```ts
import { getBranding } from "@/lib/branding";
// ... imza: export async function GET(req: Request, { params }: Ctx)
  const url = new URL(req.url);
  const themeOverride = url.searchParams.get("theme");
  const branding = await getBranding();
  const html = renderHtml({
    firmName: presentation.business.name,
    sections: presentation.sectionConfig as unknown as SectionConfig[],
    content: presentation.content as Record<string, string>,
    themeId: themeOverride ?? presentation.themeId ?? branding.defaultThemeId,
    branding,
  });
```

> `_req` parametresi `req` olarak adlandırılır (kullanılacağı için).

- [ ] **Step 4: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/presentations/[id]/pdf/route.ts app/api/presentations/[id]/route.ts app/sunum/[id]/route.ts
git commit -m "feat(sunum): pdf + onizleme + patch icin tema/marka baglama"
```

---

## Task 7: Önizleme rotası (örnek içerik)

**Files:**
- Create: `app/sunum/onizleme/route.ts`

- [ ] **Step 1: Örnek içerikli önizleme rotası**

```ts
// app/sunum/onizleme/route.ts — firma/DB gerektirmeden tema önizleme.
import { renderHtml, DEFAULT_SECTIONS, type SectionConfig } from "@/lib/presentation";
import { getBranding } from "@/lib/branding";

export const dynamic = "force-dynamic";

const SAMPLE_SECTIONS: SectionConfig[] = DEFAULT_SECTIONS.map((s) =>
  s.key === "neden-biz" ? { ...s, enabled: true } : s,
);

const SAMPLE: Record<string, string> = {
  kapak: "Müşterileriniz sizi Google'da arıyor — ama sizi bulan rakibinizi buluyor.",
  "mevcut-durum":
    "Firmanızın şu an aktif bir web sitesi bulunmuyor ve Google işletme profiliniz güncel değil. Mobil aramalarda karşınıza çıkan tek şey birkaç eski yorum.",
  "kayip-hesabi":
    "Bir müşteri hizmetinizi merak edip telefonunu eline aldığında sizi net göremediği için bir sonraki isme geçiyor. Bu sessiz kayıplar faturada görünmez.",
  rakip:
    "Aynı bölgedeki rakipleriniz düzenli sitesi, yüzlerce yorumu ve hızlı mobil sayfalarıyla aramaların önünde. İlk ekranda sizin adınız henüz yok.",
  cozum:
    "Modern, hızlı ve mobil öncelikli bir web sitesi kuruyoruz.\n- Google işletme profilini optimize ediyoruz\n- Yorum toplama akışı kuruyoruz\n- Görünürlüğü sürekli takip ediyoruz",
  cta:
    "Önümüzdeki hafta 30 dakikalık kısa bir görüşme ayarlayalım; mevcut durumunuzu birlikte ekranda görelim.",
  "neden-biz":
    "Yıllardır yerel işletmelerin dijitalde görünür olmasına yardımcı oluyoruz. Abartısız ve ölçülebilir çalışırız.",
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const branding = await getBranding();
  const themeId = url.searchParams.get("theme") ?? branding.defaultThemeId;
  const html = renderHtml({
    firmName: "Kardeşler Mobilya",
    sections: SAMPLE_SECTIONS,
    content: SAMPLE,
    themeId,
    branding,
  });
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
```

- [ ] **Step 2: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/sunum/onizleme/route.ts
git commit -m "feat(sunum): ornek icerikli tema onizleme rotasi"
```

---

## Task 8: Ayarlar sayfası + marka/tema formu

**Files:**
- Create: `app/(panel)/ayarlar/sunum/page.tsx`
- Create: `components/settings/branding-settings.tsx`
- Modify: `app/(panel)/ayarlar/page.tsx`

- [ ] **Step 1: Server sayfa**

```tsx
// app/(panel)/ayarlar/sunum/page.tsx
import { getBranding } from "@/lib/branding";
import { THEME_LIST } from "@/lib/presentation/themes";
import { BrandingSettings } from "@/components/settings/branding-settings";

export const dynamic = "force-dynamic";

export default async function SunumAyarPage() {
  const branding = await getBranding();
  const themes = THEME_LIST.map((t) => ({ id: t.id, name: t.name, description: t.description }));
  return <BrandingSettings initial={branding} themes={themes} />;
}
```

- [ ] **Step 2: Client form + tema galerisi**

```tsx
// components/settings/branding-settings.tsx
"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ImageUp, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Branding = {
  logoUrl?: string | null;
  agencyName?: string | null;
  website?: string | null;
  brandColor?: string | null;
  contact?: { phone?: string | null; email?: string | null; address?: string | null } | null;
  defaultThemeId: string;
};
type ThemeInfo = { id: string; name: string; description: string };

export function BrandingSettings({ initial, themes }: { initial: Branding; themes: ThemeInfo[] }) {
  const [b, setB] = useState<Branding>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const c = b.contact ?? {};

  function set<K extends keyof Branding>(k: K, v: Branding[K]) {
    setB((p) => ({ ...p, [k]: v }));
  }
  function setContact(k: "phone" | "email" | "address", v: string) {
    setB((p) => ({ ...p, contact: { ...(p.contact ?? {}), [k]: v } }));
  }

  function onLogo(file: File) {
    if (file.size > 1_150_000) {
      setMsg("Logo çok büyük (en fazla ~1.1MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("logoUrl", String(reader.result));
    reader.readAsDataURL(file);
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logoUrl: b.logoUrl ?? null,
          agencyName: b.agencyName ?? null,
          website: b.website ?? null,
          brandColor: b.brandColor ?? null,
          defaultThemeId: b.defaultThemeId,
          contact: b.contact ?? {},
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Kaydedilemedi");
      setMsg("Kaydedildi.");
      setTimeout(() => setMsg(null), 2500);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Hata");
    } finally {
      setBusy(false);
    }
  }

  const accent = b.brandColor || "#17913a";

  return (
    <main className="mx-auto flex min-h-full w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-8">
      <div>
        <Link href="/ayarlar" className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="size-4" /> Ayarlar
        </Link>
        <h1 className="text-2xl font-semibold">Sunum Markası & Temalar</h1>
        <p className="text-muted-foreground text-sm">
          Logonuz ve iletişim bilgileriniz her sunuma yansır. Bir varsayılan tema seçin.
        </p>
      </div>

      {msg && <div className="rounded-md border px-4 py-2 text-sm">{msg}</div>}

      {/* Ajans kimliği */}
      <section className="grid gap-5 rounded-xl border p-5">
        <h2 className="font-medium">Ajans kimliği</h2>
        <div className="flex items-center gap-4">
          <div className="flex size-20 items-center justify-center overflow-hidden rounded-lg border bg-white">
            {b.logoUrl ? (
              <img src={b.logoUrl} alt="logo" className="max-h-full max-w-full object-contain" />
            ) : (
              <ImageUp className="text-muted-foreground size-6" />
            )}
          </div>
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <ImageUp className="size-4" /> Logo yükle
            </Button>
            {b.logoUrl && (
              <Button variant="outline" onClick={() => set("logoUrl", null)}>
                <Trash2 className="size-4" /> Kaldır
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Ajans adı
            <input className="bg-background rounded-md border px-3 py-2" value={b.agencyName ?? ""} onChange={(e) => set("agencyName", e.target.value)} placeholder="DamgaBilişim" />
          </label>
          <label className="grid gap-1 text-sm">
            Web sitesi
            <input className="bg-background rounded-md border px-3 py-2" value={b.website ?? ""} onChange={(e) => set("website", e.target.value)} placeholder="damgabilisim.com" />
          </label>
          <label className="grid gap-1 text-sm">
            Telefon
            <input className="bg-background rounded-md border px-3 py-2" value={c.phone ?? ""} onChange={(e) => setContact("phone", e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            E-posta
            <input className="bg-background rounded-md border px-3 py-2" value={c.email ?? ""} onChange={(e) => setContact("email", e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            Adres
            <input className="bg-background rounded-md border px-3 py-2" value={c.address ?? ""} onChange={(e) => setContact("address", e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Marka rengi
            <span className="flex items-center gap-2">
              <input type="color" value={accent} onChange={(e) => set("brandColor", e.target.value)} className="h-9 w-12 rounded border" />
              <input className="bg-background w-28 rounded-md border px-2 py-1.5 font-mono text-sm" value={accent} onChange={(e) => set("brandColor", e.target.value)} />
            </span>
          </label>
        </div>
      </section>

      {/* Tema galerisi */}
      <section className="grid gap-4">
        <h2 className="font-medium">Tema</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {themes.map((t) => {
            const selected = b.defaultThemeId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => set("defaultThemeId", t.id)}
                className="group text-left"
              >
                <div
                  className="relative overflow-hidden rounded-xl border-2 transition"
                  style={{ borderColor: selected ? accent : "transparent" }}
                >
                  <div className="pointer-events-none h-56 w-full overflow-hidden bg-white">
                    <iframe
                      src={`/sunum/onizleme?theme=${t.id}`}
                      title={t.name}
                      className="origin-top-left"
                      style={{ width: "794px", height: "1123px", transform: "scale(0.315)", border: 0 }}
                    />
                  </div>
                  {selected && (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ background: accent }}>
                      <Check className="size-3" /> Seçili
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-muted-foreground text-xs">{t.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Kaydet
        </Button>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: `/ayarlar` sayfasına link ekle**

`app/(panel)/ayarlar/page.tsx` içine, `<AiSettings .../>`'in üstüne sarmalayıcı bir başlık + link ekle. Mevcut dönüşü şu şekilde değiştir:

```tsx
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <Link
        href="/ayarlar/sunum"
        className="mb-6 flex items-center justify-between rounded-lg border p-4 hover:bg-accent"
      >
        <span>
          <span className="block font-medium">Sunum Markası & Temalar</span>
          <span className="text-muted-foreground text-sm">Logo, iletişim ve tema seçimi</span>
        </span>
        <span aria-hidden>→</span>
      </Link>
      <AiSettings
        initial={{ provider, anthropic, gemini, models: AI_MODELS, keys }}
      />
    </div>
  );
```

Ve dosyanın başına `import Link from "next/link";` ekle.

- [ ] **Step 4: Build/lint**

Run: `npx tsc --noEmit && npx next lint`
Expected: PASS (uyarılar olabilir; hata olmamalı)

- [ ] **Step 5: Commit**

```bash
git add "app/(panel)/ayarlar/sunum/page.tsx" components/settings/branding-settings.tsx "app/(panel)/ayarlar/page.tsx"
git commit -m "feat(sunum): /ayarlar/sunum marka formu + tema galerisi"
```

---

## Task 9: Sunum editörü tema seçici

**Files:**
- Modify: `components/firma/sunum-editor.tsx`
- Modify: `app/(panel)/firma/[id]/sunum/page.tsx`

- [ ] **Step 1: Sayfa, global tema + presentation themeId geçirsin**

`app/(panel)/firma/[id]/sunum/page.tsx` içinde `getBranding` ile global temayı çek, `SunumEditor`'a `themes` (id/ad listesi), `globalThemeId` ve mevcut `initial`'a `themeId` alanını ekle. Somut ekleme:

```tsx
import { getBranding } from "@/lib/branding";
import { THEME_LIST } from "@/lib/presentation/themes";
// ... veri çekiminde:
const branding = await getBranding();
const themes = THEME_LIST.map((t) => ({ id: t.id, name: t.name }));
// initial oluşturulurken presentation objesine themeId ekle:
//   themeId: presentation?.themeId ?? null
// JSX'te:
// <SunumEditor ... themes={themes} globalThemeId={branding.defaultThemeId} />
```

> Executor mevcut `page.tsx`'i okur; `initial` map'ine `themeId: p.themeId ?? null` ekler ve `SunumEditor` çağrısına iki prop geçirir.

- [ ] **Step 2: Editöre tema seçici ekle**

`components/firma/sunum-editor.tsx`:

1. `Presentation` tipine `themeId: string | null;` ekle.
2. Bileşen prop'larına `themes: { id: string; name: string }[]` ve `globalThemeId: string` ekle.
3. Araç çubuğuna (Kaydet/Önizle butonlarının olduğu `div`) tema seçici ekle:

```tsx
<select
  value={pres.themeId ?? globalThemeId}
  onChange={async (e) => {
    const themeId = e.target.value;
    update((p) => ({ ...p, themeId }));
    await fetch(`/api/presentations/${pres.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ themeId }),
    });
  }}
  className="bg-background rounded-md border px-2 text-sm"
>
  {themes.map((t) => (
    <option key={t.id} value={t.id}>
      Tema: {t.name}
    </option>
  ))}
</select>
```

4. "Önizle" butonunu seçili temayla aç:

```tsx
onClick={() => window.open(`${previewUrl}?theme=${pres.themeId ?? globalThemeId}`, "_blank")}
```

5. `create()` sonrası dönen `setPres` objesine `themeId: p.themeId ?? null` ekle.

- [ ] **Step 3: Build/lint**

Run: `npx tsc --noEmit && npx next lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/firma/sunum-editor.tsx "app/(panel)/firma/[id]/sunum/page.tsx"
git commit -m "feat(sunum): editorde tema secici + secili tema ile onizleme"
```

---

## Task 10: 6 tema render doğrulaması

**Files:**
- Create: `scripts/preview-themes.mts`

- [ ] **Step 1: Doğrulama scripti**

```ts
// scripts/preview-themes.mts — 6 temayı örnek marka+içerikle PDF'e basar.
import { chromium } from "playwright";
import { renderHtml, DEFAULT_SECTIONS, type SectionConfig } from "../lib/presentation";
import { THEME_LIST } from "../lib/presentation/themes";

const OUT = process.env.OUT ?? ".";
const sections: SectionConfig[] = DEFAULT_SECTIONS.map((s) =>
  s.key === "neden-biz" ? { ...s, enabled: true } : s,
);
const content: Record<string, string> = {
  kapak: "Müşterileriniz sizi Google'da arıyor — ama sizi bulan rakibinizi buluyor.",
  "mevcut-durum": "Aktif web siteniz yok ve Google profiliniz güncel değil.",
  "kayip-hesabi": "Sizi net göremeyen müşteri bir sonraki isme geçiyor.",
  rakip: "Rakipleriniz aramaların önünde; ilk ekranda adınız yok.",
  cozum: "Modern site kuruyoruz.\n- Profil optimizasyonu\n- Yorum akışı\n- Görünürlük takibi",
  cta: "30 dakikalık kısa bir görüşme ayarlayalım.",
  "neden-biz": "Yerel işletmeleri dijitalde görünür kılıyoruz.",
};
// küçük yeşil kare logo (örnek)
const logo =
  "data:image/svg+xml;base64," +
  Buffer.from(
    "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='40'><rect width='120' height='40' rx='8' fill='#17913a'/><text x='12' y='26' font-family='sans-serif' font-size='18' fill='white' font-weight='700'>DAMGA</text></svg>",
  ).toString("base64");
const branding = {
  logoUrl: logo,
  agencyName: "DamgaBilişim",
  website: "damgabilisim.com",
  brandColor: "#17913a",
  contact: { phone: "0212 000 00 00", email: "info@damgabilisim.com", address: "İstanbul" },
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
for (const t of THEME_LIST) {
  const html = renderHtml({ firmName: "Kardeşler Mobilya", sections, content, themeId: t.id, branding });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.pdf({ path: `${OUT}/tema-${t.id}.pdf`, format: "A4", printBackground: true, margin: { top: "0", bottom: "0", left: "0", right: "0" } });
  console.log("ok", t.id);
}
await browser.close();
console.log("preview-themes DONE");
```

- [ ] **Step 2: Çalıştır**

Run: `OUT="<scratchpad>" npx tsx scripts/preview-themes.mts`
Expected: her tema için `ok <id>` + `preview-themes DONE`; 6 PDF üretilir.

- [ ] **Step 3: Gözle kontrol**

Her PDF'i aç (veya Read ile incele): kapak markası/logosu, kapak başlığı, bölüm numaraları, tik listesi, CTA panelinde iletişim satırı, kapanış künyesi doğru; her temanın palet/fontu ayırt edilebilir; Türkçe karakterler bozuk değil.

- [ ] **Step 4: Commit**

```bash
git add scripts/preview-themes.mts
git commit -m "test(sunum): 6 tema render dogrulama scripti"
```

---

## Task 11: Uçtan uca kontrol + PR

- [ ] **Step 1: Tam derleme + lint**

Run: `npx tsc --noEmit && npx next lint`
Expected: hata yok.

- [ ] **Step 2: Dev sunucu ile canlı kontrol (opsiyonel ama önerilir)**

Run: `npm run dev` → tarayıcıda:
- `/ayarlar/sunum`: logo yükle, alanları doldur, tema seç, Kaydet → "Kaydedildi."
- Galeri iframe'lerinde 6 tema önizlemesi görünür.
- Bir firmanın sunum editöründe tema değiştir → "Önizle" seçili temayı gösterir → "PDF indir" aynı temayı verir.

- [ ] **Step 3: PR aç**

```bash
git push -u origin feature/sunum-tema-sistemi
gh pr create --title "Sunum tema & marka sistemi (6 tema + ajans kimliği + önizleme)" --body "$(cat <<'EOF'
## Özet
- 6 markalı sunum teması (Nane, Orman Koyu, Kurumsal Yeşil, Cesur, Sıcak/Butik, Teknoloji)
- Ajans kimliği: logo (base64), ad, web, telefon/e-posta/adres, marka rengi — /ayarlar/sunum
- Anlık tema önizleme (/sunum/onizleme), firma/PDF gerektirmez
- Tema seçimi: global varsayılan + sunum başına override
- DamgaBilişim yeşil paletiyle uyumlu; varsayılan marka rengi #17913a

## Doğrulama
- scripts/preview-themes.mts → 6 tema PDF render kontrolü
- npx tsc --noEmit + next lint temiz

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review notları (planlayıcı)

- **Spec kapsamı:** 6 tema (Task 2), veri modeli (Task 5), renderHtml tema+marka (Task 3), marka API (Task 4), ayrı ayar sayfası (Task 8), önizleme (Task 7), editör entegrasyonu (Task 9), PDF (Task 6), doğrulama (Task 10) — tümü karşılandı.
- **Sıra bağımlılığı:** Prisma tipleri (Task 5) Task 4/6/8/9'un `tsc` adımlarını etkiler. Executor tip hatası görürse Task 5'i öne alır (notlar eklendi). Önerilen uygulama sırası: 1 → 2 → 3 → 5 → 4 → 6 → 7 → 8 → 9 → 10 → 11.
- **Tip tutarlılığı:** `Branding`, `BrandingRecord`, `getBranding/saveBranding`, `getTheme/themeHead/THEME_LIST`, `DEFAULT_THEME_ID` isimleri tüm tasklarda tutarlı.
- **Placeholder yok:** Tüm adımlarda gerçek kod/komut var.
