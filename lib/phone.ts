// Telefon numarası yardımcıları — sunucu bağımlılığı yok, client component'lerde de kullanılır.

// Numara sabit hat mı? (0850 dahil) — TR cep telefonları 05 ile başlar.
export function isLandlinePhone(phone: string | null): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("90") && digits.length > 10 ? digits.slice(2) : digits;
  return !local.startsWith("05");
}
