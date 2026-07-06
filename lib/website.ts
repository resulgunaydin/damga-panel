// Website sınıflandırması (Bölüm 4.3/4.5 iyileştirme).
// Google'da "site" alanı bazen Instagram/Facebook ya da bir rehber/tanıtım
// sayfası olabilir. Bunlar GERÇEK site sayılmaz → firma "gerçek sitesi yok"
// fırsatını alır; sosyal olanlar ayrıca "sosyal medya" olarak gösterilir.

export type WebsiteKind = "yok" | "gercek" | "sosyal" | "rehber";

// Sosyal medya alan adları (gerçek site değil, sosyal varlık)
const SOCIAL = [
  "instagram.com", "instagr.am", "facebook.com", "fb.com", "fb.me", "fb.watch",
  "twitter.com", "x.com", "tiktok.com", "youtube.com", "youtu.be",
  "linktr.ee", "linkedin.com", "pinterest.com", "t.me", "wa.me", "api.whatsapp.com",
];

// Rehber / tanıtım / pazar yeri siteleri (firmanın kendi sitesi değil)
const DIRECTORY = [
  "business.site", "sites.google.com", "google.com/maps", "g.page",
  "bulurum.com", "sanalbul", "rehberim", "firmarehberi", "firmasec", "vitrin",
  "index.com.tr", "yellowpages", "yelp.com", "foursquare.com", "tripadvisor",
  "zomato.com", "yemeksepeti.com", "getir.com", "armut.com", "sahibinden.com",
  "hepsiemlak.com", "emlakjet.com", "doktortakvimi.com", "sikayetvar.com",
  "n11.com", "hepsiburada.com", "trendyol.com", "gittigidiyor",
  "wixsite.com", "blogspot.com", "wordpress.com", "webnode", "weebly.com",
];

function host(url: string): string {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return (u.hostname + u.pathname).toLowerCase().replace(/^www\./, "");
  } catch {
    return url.toLowerCase();
  }
}

export function classifyWebsite(url: string | null | undefined): WebsiteKind {
  if (!url) return "yok";
  const h = host(url);
  if (SOCIAL.some((s) => h.includes(s))) return "sosyal";
  if (DIRECTORY.some((s) => h.includes(s))) return "rehber";
  return "gercek";
}

export function hasRealWebsite(url: string | null | undefined): boolean {
  return classifyWebsite(url) === "gercek";
}

export const WEBSITE_LABEL: Record<WebsiteKind, string> = {
  yok: "site yok",
  gercek: "site var",
  sosyal: "sosyal medya",
  rehber: "site yok",
};
