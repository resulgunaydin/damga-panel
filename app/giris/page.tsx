import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Giriş — DamgaPanel",
  robots: { index: false, follow: false },
};

export default async function GirisPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") ? next : "/";
  return <LoginForm next={safeNext} />;
}
