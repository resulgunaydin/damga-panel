"use client";

import { useState } from "react";
import { Briefcase, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type Payment = { id: string; amount: number; note: string | null; paidAt: string };
export type Job = {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  note: string | null;
  agreedAmount: number | null;
  payments: Payment[];
};

const STATUS_LABEL: Record<string, string> = {
  BASLAMADI: "Başlamadı",
  DEVAM: "Devam ediyor",
  BITTI: "Bitti",
};
const STATUSES = ["BASLAMADI", "DEVAM", "BITTI"];

const tl = (n: number) =>
  n.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });

export function IsTakibi({
  businessId,
  initialJobs,
}: {
  businessId: string;
  initialJobs: Job[];
}) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [nj, setNj] = useState({ open: false, title: "", deadline: "", agreedAmount: "" });

  async function addJob() {
    const title = nj.title.trim();
    if (!title) return;
    const res = await fetch(`/api/businesses/${businessId}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        deadline: nj.deadline || null,
        agreedAmount: nj.agreedAmount || null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setJobs((j) => [
        {
          ...data.job,
          agreedAmount: data.job.agreedAmount != null ? Number(data.job.agreedAmount) : null,
          payments: [],
        },
        ...j,
      ]);
      setNj({ open: false, title: "", deadline: "", agreedAmount: "" });
    }
  }

  async function setStatus(job: Job, status: string) {
    setJobs((js) => js.map((j) => (j.id === job.id ? { ...j, status } : j)));
    await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function deleteJob(id: string) {
    if (!confirm("İş silinsin mi?")) return;
    setJobs((js) => js.filter((j) => j.id !== id));
    await fetch(`/api/jobs/${id}`, { method: "DELETE" });
  }

  async function addPayment(jobId: string, amountStr: string, note: string) {
    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const res = await fetch(`/api/jobs/${jobId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, note }),
    });
    const data = await res.json();
    if (res.ok) {
      setJobs((js) =>
        js.map((j) =>
          j.id === jobId
            ? { ...j, payments: [...j.payments, { ...data.payment, amount: Number(data.payment.amount) }] }
            : j,
        ),
      );
    }
  }

  async function deletePayment(jobId: string, pid: string) {
    setJobs((js) =>
      js.map((j) =>
        j.id === jobId ? { ...j, payments: j.payments.filter((p) => p.id !== pid) } : j,
      ),
    );
    await fetch(`/api/payments/${pid}`, { method: "DELETE" });
  }

  return (
    <section className="rounded-lg border border-green-300 p-4 dark:border-green-900/60">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <Briefcase className="size-4" /> İş Takibi
        </h2>
        <Button variant="outline" size="sm" onClick={() => setNj((n) => ({ ...n, open: !n.open }))}>
          <Plus className="size-4" /> İş ekle
        </Button>
      </div>

      {nj.open && (
        <div className="mb-3 grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <Input
            placeholder="İş (ör. Web sitesi)"
            value={nj.title}
            onChange={(e) => setNj((n) => ({ ...n, title: e.target.value }))}
          />
          <Input
            type="date"
            title="Deadline"
            value={nj.deadline}
            onChange={(e) => setNj((n) => ({ ...n, deadline: e.target.value }))}
          />
          <Input
            type="number"
            placeholder="Anlaşılan ₺"
            value={nj.agreedAmount}
            onChange={(e) => setNj((n) => ({ ...n, agreedAmount: e.target.value }))}
          />
          <Button onClick={addJob} disabled={!nj.title.trim()}>
            Ekle
          </Button>
        </div>
      )}

      {jobs.length === 0 ? (
        <p className="text-muted-foreground text-sm">Henüz iş eklenmedi.</p>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onStatus={(s) => setStatus(job, s)}
              onDelete={() => deleteJob(job.id)}
              onAddPayment={(a, n) => addPayment(job.id, a, n)}
              onDeletePayment={(pid) => deletePayment(job.id, pid)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function JobCard({
  job,
  onStatus,
  onDelete,
  onAddPayment,
  onDeletePayment,
}: {
  job: Job;
  onStatus: (s: string) => void;
  onDelete: () => void;
  onAddPayment: (amount: string, note: string) => void;
  onDeletePayment: (pid: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const paid = job.payments.reduce((s, p) => s + p.amount, 0);
  const remaining = job.agreedAmount != null ? job.agreedAmount - paid : null;

  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{job.title}</span>
        <div className="flex items-center gap-2">
          <select
            value={job.status}
            onChange={(e) => onStatus(e.target.value)}
            className="bg-background rounded border px-2 py-1 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <button onClick={onDelete} className="text-muted-foreground p-1 hover:text-red-600">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {job.deadline && <span>Termin: {new Date(job.deadline).toLocaleDateString("tr-TR")}</span>}
        {job.agreedAmount != null && <span>Anlaşılan: {tl(job.agreedAmount)}</span>}
        {job.agreedAmount != null && <span>Alınan: {tl(paid)}</span>}
        {remaining != null && (
          <span className={remaining > 0 ? "font-medium text-orange-600" : "text-green-600"}>
            Kalan: {tl(remaining)}
          </span>
        )}
      </div>

      {job.payments.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs">
          {job.payments.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <span className="text-muted-foreground w-24">
                {new Date(p.paidAt).toLocaleDateString("tr-TR")}
              </span>
              <span className="font-medium">{tl(p.amount)}</span>
              {p.note && <span className="text-muted-foreground">· {p.note}</span>}
              <button
                onClick={() => onDeletePayment(p.id)}
                className="text-muted-foreground ml-auto hover:text-red-600"
              >
                <Trash2 className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex gap-2">
        <Input
          type="number"
          placeholder="Tahsilat ₺"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-8"
        />
        <Input
          placeholder="Not (opsiyonel)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="h-8"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            onAddPayment(amount, note);
            setAmount("");
            setNote("");
          }}
          disabled={!amount}
        >
          Ödeme ekle
        </Button>
      </div>
    </div>
  );
}
