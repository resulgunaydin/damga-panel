// Sunum motoru (Bölüm 4.8) — ikna aracı. Hikâye: aynayı tut → rakip önde →
// fırsat/hasta kaybı → çözüm → başlayalım. FİYAT/ROI YOK.
// AI taslak üretir; son söz kullanıcıda (bölümleri düzenler/kapatır).

import { generateText } from "@/lib/ai";
import { getTheme, themeHead } from "./presentation/themes";
import { DEFAULT_BRAND_COLOR } from "./presentation/brand";

export type Branding = {
  logoUrl?: string | null;
  agencyName?: string | null;
  website?: string | null;
  brandColor?: string | null;
  contact?: {
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  } | null;
};

export type SectionKey =
  | "kapak"
  | "mevcut-durum"
  | "kayip-hesabi"
  | "rakip"
  | "cozum"
  | "cta"
  | "neden-biz";

export type SectionConfig = { key: SectionKey; title: string; enabled: boolean };

// Varsayılan bölümler (Fiyatlandırma bölümü YOK — Bölüm 4.8).
export const DEFAULT_SECTIONS: SectionConfig[] = [
  { key: "kapak", title: "Kapak", enabled: true },
  { key: "mevcut-durum", title: "Mevcut durum", enabled: true },
  { key: "kayip-hesabi", title: "Kayıp hesabı", enabled: true },
  { key: "rakip", title: "Rakip kıyası", enabled: true },
  { key: "cozum", title: "Çözüm & yapılacaklar", enabled: true },
  { key: "cta", title: "Sonraki adım", enabled: true },
  { key: "neden-biz", title: "Neden biz", enabled: false },
];

const SECTION_BRIEF: Record<SectionKey, string> = {
  kapak: "Kısa, güçlü bir kapak başlığı ve tek cümlelik vaat yaz.",
  "mevcut-durum":
    "Firmanın mevcut dijital durumunu (web sitesi, mobil, hız, Google profili) dürüstçe özetle — aynayı tut.",
  "kayip-hesabi":
    "Bu açıkların yol açtığı fırsat/müşteri kaybını anlat. RAKAM/FİYAT VERME; sadece kaybın hikâyesini kur.",
  rakip: "Rakiplerle kıyasla; firmanın nerede geride kaldığını net söyle.",
  cozum: "Somut çözüm ve yapılacaklar listesini maddeler halinde yaz.",
  cta: "Nazik ama net bir harekete geçirici çağrı (sonraki adım) yaz.",
  "neden-biz": "Kısa, abartısız bir güven/neden-biz paragrafı yaz.",
};

// Firma + analiz verisinden bağlam metni.
export function buildContext(input: {
  name: string;
  sector: string | null;
  city: string | null;
  hasWebsite: boolean;
  websiteSummary?: string | null;
  gbpSummary?: string | null;
  competitorText?: string | null;
  opportunities?: string[];
}): string {
  const p: string[] = [`Firma: ${input.name}`];
  if (input.sector) p.push(`Sektör: ${input.sector}`);
  if (input.city) p.push(`Şehir: ${input.city}`);
  p.push(`Web sitesi: ${input.hasWebsite ? "var" : "yok"}`);
  if (input.websiteSummary) p.push(`Website analizi: ${input.websiteSummary}`);
  if (input.gbpSummary) p.push(`Google Business: ${input.gbpSummary}`);
  if (input.competitorText) p.push(`Rakip durumu: ${input.competitorText}`);
  if (input.opportunities?.length) p.push(`Satış fırsatları: ${input.opportunities.join(", ")}`);
  return p.join("\n");
}

// Bir bölümün AI taslağını üretir.
export async function draftSection(key: SectionKey, context: string): Promise<string> {
  const out = await generateText({
    system:
      "Bir dijital ajans için ikna edici bir satış sunumu bölümü yazıyorsun. Kısa, net, Türkçe. ASLA fiyat, ücret, ROI veya rakamsal ciro yazma. Sadece bölüm metnini üret; başlık ekleme.",
    prompt: `Firma bağlamı:\n${context}\n\nGörev: ${SECTION_BRIEF[key]}`,
    tier: "simple",
    maxTokens: 400,
  });
  return out.text.trim();
}

// Tüm etkin bölümleri TEK çağrıda üretir (kota dostu — 6 istek yerine 1).
// Kalıp; kaliteyi düşürmeden az istek harcar.
export async function draftAllSections(
  sections: SectionConfig[],
  context: string,
): Promise<Record<string, string>> {
  const enabled = sections.filter((s) => s.enabled);
  const spec = enabled
    .map((s, i) => `${i + 1}. [[${s.key}]] "${s.title}" — ${SECTION_BRIEF[s.key]}`)
    .join("\n");
  const out = await generateText({
    system: [
      "Sen üst düzey bir dijital ajansın satış metni yazarısın. Bir firma için ikna edici, sıcak ama profesyonel bir satış sunumunun bölümlerini yazacaksın.",
      "Kurallar:",
      "- Türkçe, akıcı ve somut yaz. Klişe ve dolgu cümlelerden kaçın.",
      "- Firmanın verilen gerçek açıklarına (site yok, düşük puan, az yorum, rakip vb.) dayan; uydurma veri ekleme.",
      "- ASLA fiyat, ücret, paket, ROI ya da rakamsal ciro yazma.",
      "- Her bölüm 2-4 cümle; kapak 1 vurucu başlık + tek cümle vaat; çözüm bölümünde 3-5 maddelik liste kullanabilirsin.",
      "- Çıktı biçimi KESİN: her bölüm kendi satırında '[[bölüm-anahtarı]]' ile başlar, hemen altına bölüm metni gelir. Başlık, numara veya ek açıklama yazma.",
    ].join("\n"),
    prompt: `FİRMA BAĞLAMI:\n${context}\n\nAşağıdaki bölümleri sırayla, verilen anahtarlarla yaz:\n${spec}`,
    tier: "simple",
    maxTokens: 1600,
  });
  const content: Record<string, string> = {};
  const re = /\[\[\s*([a-zçğıöşü-]+)\s*\]\]\s*([\s\S]*?)(?=\[\[\s*[a-zçğıöşü-]+\s*\]\]|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(out.text)) !== null) {
    const key = m[1].toLowerCase();
    const body = m[2].trim();
    if (enabled.some((s) => s.key === key) && body) content[key] = body;
  }
  return content;
}

// Metni paragraf + madde listesine dönüştürür (- • * ya da 1. ile başlayanlar liste).
function renderBody(text: string): string {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  let html = "";
  let inList = false;
  const bulletRe = /^([-–•*]|\d+[.)])\s+/;
  for (const line of lines) {
    if (bulletRe.test(line)) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${escapeHtml(line.replace(bulletRe, ""))}</li>`;
    } else {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<p>${escapeHtml(line)}</p>`;
    }
  }
  if (inList) html += "</ul>";
  return html;
}

// Sunumu profesyonel bir HTML sunuma dönüştürür (önizleme + PDF için).
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
