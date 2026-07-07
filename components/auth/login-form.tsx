"use client";

import { useState } from "react";
import { Loader2, LogIn, Stamp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoginForm({ next }: { next: string }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Giriş başarısız.");
      }
      // Tam yönlendirme — middleware yeni çerezi görsün.
      window.location.href = next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(80%_60%_at_50%_-10%,#d8f6e0,transparent_60%)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="bg-primary text-primary-foreground grid size-11 place-items-center rounded-xl shadow-sm">
            <Stamp className="size-6" />
          </span>
          <h1 className="font-heading text-xl font-extrabold tracking-tight">
            Damga<span className="text-primary">Panel</span>
          </h1>
          <p className="text-muted-foreground text-sm">Devam etmek için giriş yapın.</p>
        </div>

        <form onSubmit={submit} className="bg-background grid gap-4 rounded-2xl border p-6 shadow-sm">
          {error && (
            <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          )}
          <label className="grid gap-1 text-sm">
            Kullanıcı adı
            <input
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-background rounded-md border px-3 py-2"
              required
            />
          </label>
          <label className="grid gap-1 text-sm">
            Şifre
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background rounded-md border px-3 py-2"
              required
            />
          </label>
          <Button type="submit" disabled={busy} className="mt-1 w-full">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
            Giriş yap
          </Button>
        </form>
      </div>
    </main>
  );
}
