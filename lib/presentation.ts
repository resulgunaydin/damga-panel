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
  brandColor?: string;
}): string {
  const brand = input.brandColor || "#ea580c";
  const enabled = input.sections.filter((s) => s.enabled && input.content[s.key]);
  const kapak = enabled.find((s) => s.key === "kapak");
  const rest = enabled.filter((s) => s.key !== "kapak");
  const tarih = new Date().toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" });

  const cover = `
    <div class="cover">
      <div class="cover-top">
        <span class="mark">◆ DamgaPanel</span>
        <span class="eyebrow">Dijital Görünürlük Değerlendirmesi</span>
      </div>
      <div class="cover-main">
        <h1>${escapeHtml(input.firmName)}</h1>
        ${kapak ? `<div class="lead">${renderBody(input.content["kapak"])}</div>` : ""}
      </div>
      <div class="cover-foot">
        <span>${tarih}</span>
        <span>${escapeHtml(input.firmName)} için hazırlanmıştır</span>
      </div>
    </div>`;

  const body = rest
    .map(
      (s, i) => `
    <section>
      <div class="s-head">
        <span class="s-no">${String(i + 1).padStart(2, "0")}</span>
        <h2>${escapeHtml(s.title)}</h2>
      </div>
      <div class="s-body">${renderBody(input.content[s.key])}</div>
    </section>`,
    )
    .join("");

  return `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(input.firmName)} — Sunum</title>
<style>
  :root{ --brand:${brand}; --ink:#1c1a17; --muted:#6b6560; --line:#e7e2da; --paper:#fbf9f5; }
  @page{ size:A4; margin:0; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{ font-family:"Segoe UI",-apple-system,Helvetica,Arial,sans-serif; color:var(--ink); background:#fff; line-height:1.65; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  h1,h2{ font-family:Georgia,"Times New Roman",serif; letter-spacing:-.01em; }

  /* Kapak — ilk sayfayı doldurur */
  .cover{ min-height:297mm; padding:26mm 22mm; display:flex; flex-direction:column; justify-content:space-between;
    background:
      radial-gradient(120% 80% at 100% 0%, color-mix(in srgb, var(--brand) 16%, transparent), transparent 60%),
      linear-gradient(180deg, var(--paper), #fff);
    border-top:10px solid var(--brand); page-break-after:always; }
  .cover-top{ display:flex; justify-content:space-between; align-items:center; }
  .mark{ font-weight:800; color:var(--brand); letter-spacing:.02em; }
  .eyebrow{ font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:var(--muted); }
  .cover-main h1{ font-size:52px; line-height:1.05; margin:0 0 18px; }
  .cover-main .lead p{ font-size:22px; line-height:1.4; color:#403b36; margin:0 0 10px; max-width:80%; }
  .cover-foot{ display:flex; justify-content:space-between; font-size:12px; color:var(--muted); border-top:1px solid var(--line); padding-top:14px; }

  /* İçerik */
  .content{ padding:20mm 22mm; }
  section{ margin:0 0 26px; page-break-inside:avoid; }
  .s-head{ display:flex; align-items:baseline; gap:12px; border-bottom:1px solid var(--line); padding-bottom:8px; margin-bottom:12px; }
  .s-no{ font-family:Georgia,serif; font-weight:700; font-size:18px; color:var(--brand); min-width:30px; }
  h2{ font-size:22px; margin:0; color:var(--ink); }
  .s-body p{ margin:0 0 10px; }
  .s-body ul{ margin:6px 0 10px; padding-left:0; list-style:none; }
  .s-body li{ position:relative; padding-left:22px; margin:6px 0; }
  .s-body li::before{ content:"→"; position:absolute; left:0; color:var(--brand); font-weight:700; }

  footer{ margin-top:8mm; padding:12px 22mm 20mm; color:var(--muted); font-size:11px; border-top:1px solid var(--line); display:flex; justify-content:space-between; }
</style></head><body>
${cover}
<div class="content">
${body}
</div>
<footer><span>${escapeHtml(input.firmName)}</span><span>DamgaPanel</span></footer>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
