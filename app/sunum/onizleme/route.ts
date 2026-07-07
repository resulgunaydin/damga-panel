// Firma/DB gerektirmeden tema önizleme — örnek yer-tutucu içerik.
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
