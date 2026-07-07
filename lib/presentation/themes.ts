import { BRAND, DEFAULT_BRAND_COLOR } from "./brand";

export type ThemeId =
  | "orman-koyu"
  | "nane"
  | "kurumsal-yesil"
  | "cesur"
  | "sicak-butik"
  | "teknoloji";

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
        "radial-gradient(90% 60% at 108% -6%, color-mix(in srgb, var(--accent) 55%, transparent), transparent 58%), radial-gradient(80% 55% at -12% 112%, color-mix(in srgb, var(--accent) 24%, transparent), transparent 60%), linear-gradient(155deg,#1f2a20 0%," +
        BRAND.ink +
        " 46%,#0e1510 100%)",
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
        "radial-gradient(80% 60% at 100% 0%," +
        BRAND.mint +
        ",transparent 60%),radial-gradient(70% 50% at 0% 100%," +
        BRAND.mint2 +
        ",transparent 60%),#fff",
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
      "--cover-bg":
        "linear-gradient(135deg," +
        BRAND.green700 +
        " 0%," +
        BRAND.green600 +
        " 55%," +
        BRAND.lime +
        " 130%)",
      "--cover-fg": "#f2fff4",
      "--cover-head": "#fff",
      "--cover-lead": "rgba(242,255,244,.92)",
      "--cover-line": "rgba(242,255,244,.24)",
      "--cover-muted": "rgba(242,255,244,.7)",
      "--cta-bg": BRAND.cream,
      "--noise-op": "0",
    },
    extraCss:
      ".cover-main h1{font-size:clamp(50px,10vw,88px);letter-spacing:-.03em;text-transform:uppercase}.cover-kicker{background:#fff;color:" +
      BRAND.green700 +
      ";border-color:#fff}",
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
        "radial-gradient(80% 60% at 100% 0%," +
        BRAND.mint +
        ",transparent 60%),linear-gradient(180deg,#fbf7ef,#f4faf5)",
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
      "--cover-bg":
        "radial-gradient(70% 50% at 100% 0%,color-mix(in srgb,var(--accent) 30%,transparent),transparent 60%),#0c1310",
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
