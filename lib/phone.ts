// Telefon numarası yardımcıları — sunucu bağımlılığı yok, client component'lerde de kullanılır.

// Numara sabit hat mı? (0850/0800/0900 dahil) — TR cep telefonları 05 ile başlar.
export function isLandlinePhone(phone: string | null): boolean {
  if (!phone) return false;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length > 10) digits = digits.slice(2); // ülke kodu (+90) at
  if (digits.length === 10 && !digits.startsWith("0")) digits = "0" + digits; // baştaki 0 eksikse ekle
  return !digits.startsWith("05");
}
