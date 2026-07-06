// Sunum motoru (Bölüm 4.8) — ikna aracı. Hikâye: aynayı tut → rakip önde →
// fırsat/hasta kaybı → çözüm → başlayalım. FİYAT/ROI YOK.
// AI taslak üretir; son söz kullanıcıda (bölümleri düzenler/kapatır).

import { generateText } from "@/lib/ai";

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

// Sunumu tek sayfalık HTML'e dönüştürür (önizleme + PDF için).
export function renderHtml(input: {
  firmName: string;
  sections: SectionConfig[];
  content: Record<string, string>;
  brandColor?: string;
}): string {
  const color = input.brandColor || "#ea580c";
  const blocks = input.sections
    .filter((s) => s.enabled && input.content[s.key])
    .map((s) => {
      const body = input.content[s.key]
        .split("\n")
        .filter(Boolean)
        .map((line) => `<p>${escapeHtml(line)}</p>`)
        .join("");
      if (s.key === "kapak") {
        return `<header class="kapak"><div class="brand">${escapeHtml(input.firmName)}</div>${body}</header>`;
      }
      return `<section><h2>${escapeHtml(s.title)}</h2>${body}</section>`;
    })
    .join("");

  return `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(input.firmName)} — Sunum</title>
<style>
  :root{--brand:${color}}
  *{box-sizing:border-box}
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a;max-width:760px;margin:0 auto;padding:32px;line-height:1.6}
  .kapak{border-bottom:4px solid var(--brand);padding-bottom:24px;margin-bottom:24px}
  .kapak .brand{color:var(--brand);font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
  .kapak p{font-size:24px;font-weight:600;margin:8px 0 0}
  section{margin:28px 0}
  h2{color:var(--brand);font-size:18px;border-left:3px solid var(--brand);padding-left:10px}
  p{margin:8px 0}
  footer{margin-top:40px;border-top:1px solid #eee;padding-top:16px;color:#888;font-size:12px}
</style></head><body>
${blocks}
<footer>Bu sunum ${escapeHtml(input.firmName)} için hazırlanmıştır.</footer>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
