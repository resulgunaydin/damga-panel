// Basit tek kullanıcı oturumu — imzalı HttpOnly çerez (HMAC-SHA256).
// Web Crypto kullanır: hem Edge middleware'de hem Node rotalarında çalışır.
// Veritabanı/kayıt yok; kullanıcı adı+şifre .env'den, çerez AUTH_SECRET ile imzalanır.

const enc = new TextEncoder();

export const SESSION_COOKIE = "damga_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 gün (saniye)

export const AUTH_USER = process.env.AUTH_USER || "damgabilisim";
export const AUTH_PASSWORD = process.env.AUTH_PASSWORD || "123sifre123";
const SECRET =
  process.env.AUTH_SECRET || "damga-panel-lutfen-bu-gizli-anahtari-degistirin-uzun-olsun";

function base64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return base64url(new Uint8Array(sig));
}

// Sabit zamanlı string karşılaştırma (imza sızıntısını önler).
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

// Oturum jetonu üretir: "<user>.<exp>.<imza>"
export async function createToken(): Promise<string> {
  const exp = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = `${AUTH_USER}.${exp}`;
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

// Jetonu doğrular: imza geçerli + süresi dolmamış.
export async function verifyToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const sigIdx = token.lastIndexOf(".");
  if (sigIdx < 0) return false;
  const payload = token.slice(0, sigIdx);
  const sig = token.slice(sigIdx + 1);
  const expIdx = payload.lastIndexOf(".");
  if (expIdx < 0) return false;
  const exp = Number(payload.slice(expIdx + 1));
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = await hmac(payload);
  return timingSafeEqual(sig, expected);
}

// Kullanıcı adı+şifre kontrolü.
export function checkCredentials(username: unknown, password: unknown): boolean {
  return (
    typeof username === "string" &&
    typeof password === "string" &&
    username === AUTH_USER &&
    password === AUTH_PASSWORD
  );
}
