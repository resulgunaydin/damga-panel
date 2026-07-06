// Ucuz site sağlık kontrolü (Bölüm 4.3) — Google API'si DEĞİL, siteye doğrudan
// HTTP isteği. Maliyetsiz. SSL / mobil (viewport) / açılıyor mu sinyalleri.

export type SiteCheck = {
  reachable: boolean; // site açılıyor mu
  https: boolean; // SSL var mı (nihai URL https mi)
  hasViewport: boolean; // mobil meta viewport var mı
};

const TIMEOUT_MS = 5000;
const MAX_BYTES = 200_000; // sadece <head> yeterli; ilk ~200KB'ı okuruz

function normalize(url: string): string {
  if (!/^https?:\/\//i.test(url)) return `https://${url}`;
  return url;
}

export async function checkSite(website: string): Promise<SiteCheck> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(normalize(website), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        // Gerçekçi bir UA; bazı siteler botları engelliyor.
        "User-Agent":
          "Mozilla/5.0 (compatible; DamgaPanelBot/1.0; +internal)",
        Accept: "text/html",
      },
    });

    const https = res.url.startsWith("https://");
    let hasViewport = false;
    try {
      const reader = res.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        let html = "";
        let bytes = 0;
        while (bytes < MAX_BYTES) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          html += decoder.decode(value, { stream: true });
          if (/<\/head>/i.test(html)) break; // head bitti, yeter
        }
        await reader.cancel().catch(() => {});
        hasViewport = /name=["']?viewport/i.test(html);
      }
    } catch {
      // gövde okunamadıysa viewport bilinmiyor kabul et
    }

    return { reachable: res.ok, https, hasViewport };
  } catch {
    // zaman aşımı / DNS / bağlantı hatası → açılmıyor
    return { reachable: false, https: false, hasViewport: false };
  } finally {
    clearTimeout(timer);
  }
}

// Sınırlı eşzamanlılıkla toplu çalıştırma (siteleri boğmadan).
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}
