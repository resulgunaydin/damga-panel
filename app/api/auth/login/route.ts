import { NextResponse } from "next/server";
import {
  checkCredentials,
  createToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
  };
  if (!checkCredentials(body.username, body.password)) {
    return NextResponse.json({ error: "Kullanıcı adı veya şifre hatalı." }, { status: 401 });
  }
  const token = await createToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
