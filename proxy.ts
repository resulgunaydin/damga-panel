import { NextResponse, type NextRequest } from "next/server";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth";

// Giriş gerektirmeyen yollar (giriş sayfası + auth API).
const PUBLIC = ["/giris", "/api/auth/login", "/api/auth/logout"];

// Next 16: "middleware" yerine "proxy" dosya kuralı (bkz. proxy.md).
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"));

  let res: NextResponse;
  if (isPublic) {
    res = NextResponse.next();
  } else {
    const ok = await verifyToken(req.cookies.get(SESSION_COOKIE)?.value);
    if (ok) {
      res = NextResponse.next();
    } else if (pathname.startsWith("/api/")) {
      res = NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
    } else {
      const url = req.nextUrl.clone();
      url.pathname = "/giris";
      url.search = "";
      if (pathname !== "/") url.searchParams.set("next", pathname);
      res = NextResponse.redirect(url);
    }
  }

  // Arama motorlarına yansımasın — özel panel.
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  // Statik dosyalar ve robots.txt hariç her isteği kontrol et.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
