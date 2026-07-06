// Gerçek tarayıcı gözlemi (Bölüm 4.5) — Playwright ile mobil render.
// Açılıyor mu, yüklenme süresi, mobil viewport, başlık.

import { chromium } from "playwright";

export type BrowserObs = {
  reachable: boolean;
  loadMs: number | null;
  hasViewport: boolean;
  title: string | null;
};

function normalize(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export async function observeSite(url: string): Promise<BrowserObs> {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 }, // mobil
      userAgent:
        "Mozilla/5.0 (compatible; DamgaPanelBot/1.0; +internal)",
    });
    const start = Date.now();
    const resp = await page.goto(normalize(url), {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    const loadMs = Date.now() - start;
    const title = await page.title().catch(() => null);
    const hasViewport = await page
      .$('meta[name="viewport"]')
      .then((el) => !!el)
      .catch(() => false);
    return { reachable: !!resp && resp.ok(), loadMs, hasViewport, title };
  } catch {
    return { reachable: false, loadMs: null, hasViewport: false, title: null };
  } finally {
    await browser?.close().catch(() => {});
  }
}
