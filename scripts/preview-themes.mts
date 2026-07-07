// 6 temayı örnek marka+içerikle PDF'e basar (gözle doğrulama için).
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
// küçük yeşil örnek logo
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
  await page.pdf({
    path: `${OUT}/tema-${t.id}.pdf`,
    format: "A4",
    printBackground: true,
    margin: { top: "0", bottom: "0", left: "0", right: "0" },
  });
  console.log("ok", t.id);
}
await browser.close();
console.log("preview-themes DONE");
