"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Service = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
};

export function ServicesManager({ initial }: { initial: Service[] }) {
  const [services, setServices] = useState<Service[]>(initial);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, description: desc }),
      });
      const data = await res.json();
      if (res.ok) {
        setServices((s) => [...s, data.service]);
        setName("");
        setDesc("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggle(s: Service) {
    setServices((list) =>
      list.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)),
    );
    await fetch(`/api/services/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !s.active }),
    });
  }

  async function remove(id: string) {
    if (!confirm("Hizmet silinsin mi?")) return;
    setServices((list) => list.filter((x) => x.id !== id));
    await fetch(`/api/services/${id}`, { method: "DELETE" });
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <Link
          href="/calisma-alani"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" /> Arama Alanı
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Package className="size-6" /> Hizmet Listesi
        </h1>
        <p className="text-muted-foreground text-sm">
          Sunduğun hizmetler — <b>fiyatsız</b>, sadece “hangi hizmetler var”. Satış
          fırsatı motoru bunları önceliklendirir.
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Hizmet adı (ör. Web sitesi tasarımı)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Button onClick={add} disabled={busy || !name.trim()}>
            <Plus className="size-4" /> Ekle
          </Button>
        </div>
        <Input
          placeholder="Kısa açıklama (opsiyonel)"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>

      {services.length === 0 ? (
        <p className="text-muted-foreground text-sm">Henüz hizmet eklenmedi.</p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-lg border">
          {services.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-4 py-3">
              <label className="flex flex-1 items-center gap-3">
                <input
                  type="checkbox"
                  checked={s.active}
                  onChange={() => toggle(s)}
                  className="size-4"
                />
                <span className={s.active ? "" : "text-muted-foreground line-through"}>
                  <span className="font-medium">{s.name}</span>
                  {s.description && (
                    <span className="text-muted-foreground text-sm"> — {s.description}</span>
                  )}
                </span>
              </label>
              <button
                onClick={() => remove(s.id)}
                className="text-muted-foreground p-1 hover:text-red-600"
                title="Sil"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
