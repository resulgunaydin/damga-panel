// Telefon türü sınıflandırması (sabit hat / mobil).
// Amaç: soğuk temas telefon pivotunda "sabit hat" numaraları (02xx/03xx/04xx/08xx …)
// gerçek cep numaralarından (05xx) ayırıp filtreleyebilmek.

export type PhoneKind = "mobil" | "sabit" | "yok";

// TR numarasını sadeleştir: sadece rakam, +90 / 0 ön eklerini at.
function normalize(phone: string): string {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("90")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return d;
}

// Numarayı türüne göre sınıflandırır.
// TR cep: 10 hane, "5" ile başlar (05xx). Diğer her şey (2/3/4 coğrafi, 8 özel/ücretsiz,
// ya da tanınmayan/kısa numara) "sabit hat" kabul edilir.
export function phoneKind(phone: string | null | undefined): PhoneKind {
  if (!phone || !phone.trim()) return "yok";
  const d = normalize(phone);
  if (d.length === 10 && d.startsWith("5")) return "mobil";
  return "sabit";
}

export function isMobile(phone: string | null | undefined): boolean {
  return phoneKind(phone) === "mobil";
}

// wa.me için uluslararası numara (ülke koduyla, + ve boşluk olmadan). TR varsayımı:
// "0532…" → "90532…", zaten "90…" ise korunur, 10 haneli "5…" → "905…". Geçersizse null.
export function waMeNumber(phone: string | null | undefined): string | null {
  if (!phone || !phone.trim()) return null;
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("90")) {
    // ülke kodu zaten var
  } else if (d.startsWith("0")) {
    d = "90" + d.slice(1);
  } else if (d.length === 10) {
    d = "90" + d;
  }
  return d.length >= 12 ? d : null; // 90 + 10 hane
}

export const PHONE_KIND_LABEL: Record<PhoneKind, string> = {
  mobil: "Cep (normal)",
  sabit: "Sabit hat",
  yok: "Numara yok",
};
