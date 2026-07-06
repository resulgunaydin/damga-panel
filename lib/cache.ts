// Çapraz-kesen cache/kalıcılık ilkesi (Bölüm 5).
//
// Kural: Limit/maliyet harcayan HER dış çağrı (Google Places, PageSpeed,
// AI üretim, analiz) önce veritabanından kontrol edilir; veri varsa API'ye
// HİÇ gidilmez. "Tazele" ancak kullanıcı elle isterse (force) çalışır.
// Özet: aynı veriyi iki kez satın alma.
//
// Bu yardımcı, tüm modüllerin (keşif dedup, kaba eleme, mesaj, analiz)
// uyguladığı "önce-DB-sonra-API" desenini tek yerde tanımlar.

export type Cached<T> = { data: T; cached: boolean };

// Önce DB'den bul; yoksa (veya force ise) hesapla/üret ve döndür.
export async function getCachedOrCompute<T>(opts: {
  find: () => Promise<T | null>;
  compute: () => Promise<T>;
  force?: boolean;
}): Promise<Cached<T>> {
  if (!opts.force) {
    const existing = await opts.find();
    if (existing) return { data: existing, cached: true };
  }
  const data = await opts.compute();
  return { data, cached: false };
}
