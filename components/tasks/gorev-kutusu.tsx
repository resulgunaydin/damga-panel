"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Clock, Inbox, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Task = {
  id: string;
  title: string;
  kind: string;
  dueAt: string | null;
  business: { id: string; name: string } | null;
};

const KIND_LABEL: Record<string, string> = {
  TAKIP: "takip",
  DEADLINE: "termin",
  MANUEL: "manuel",
};
const KIND_STYLE: Record<string, string> = {
  TAKIP: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
  DEADLINE: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  MANUEL: "bg-muted text-muted-foreground",
};

export function GorevKutusu({ initial }: { initial: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initial);
  const [busy, setBusy] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  async function refreshList() {
    const res = await fetch("/api/tasks");
    if (res.ok) setTasks((await res.json()).tasks);
  }

  async function generate() {
    setBusy(true);
    try {
      await fetch("/api/tasks/generate", { method: "POST" });
      await refreshList();
    } finally {
      setBusy(false);
    }
  }

  async function complete(id: string) {
    setTasks((t) => t.filter((x) => x.id !== id));
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete" }),
    });
  }

  async function snooze(id: string, days: number) {
    setTasks((t) => t.filter((x) => x.id !== id));
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "snooze", days }),
    });
  }

  async function addManual() {
    const title = newTitle.trim();
    if (!title) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const data = await res.json();
    if (res.ok) {
      setTasks((t) => [
        { id: data.task.id, title: data.task.title, kind: "MANUEL", dueAt: data.task.dueAt, business: null },
        ...t,
      ]);
      setNewTitle("");
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <Link
          href="/calisma-alani"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" /> Çalışma Alanı
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              <Inbox className="size-6" /> Görev Kutusu
            </h1>
            <p className="text-muted-foreground text-sm">Bugünün işleri · {tasks.length} görev</p>
          </div>
          <Button variant="outline" onClick={generate} disabled={busy}>
            <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} /> Tazele
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Manuel görev ekle"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addManual()}
        />
        <Button variant="outline" onClick={addManual} disabled={!newTitle.trim()}>
          <Plus className="size-4" /> Ekle
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-muted-foreground flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center">
          <Check className="size-8 opacity-40" />
          <p>Bugün için görev yok. 🎉</p>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-lg border">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
              <span className={`rounded px-1.5 py-0.5 text-xs ${KIND_STYLE[t.kind]}`}>
                {KIND_LABEL[t.kind]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm">
                  {t.business ? (
                    <Link href={`/firma/${t.business.id}`} className="hover:underline">
                      {t.title}
                    </Link>
                  ) : (
                    t.title
                  )}
                </div>
                {t.dueAt && (
                  <div className="text-muted-foreground text-xs">
                    {new Date(t.dueAt).toLocaleDateString("tr-TR")}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => snooze(t.id, 1)}
                  title="1 gün ertele"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded px-2 py-1 text-xs"
                >
                  <Clock className="size-3.5" /> ertele
                </button>
                <Button size="sm" variant="outline" onClick={() => complete(t.id)}>
                  <Check className="size-4" /> Tamam
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
