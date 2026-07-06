// DamgaPanel — arka plan worker süreci.
// Görevi: takip otomasyonu sessizlik sayaçlarını periyodik değerlendirmek (Bölüm 4.10).
// Not: Kural motoru Next uygulamasında (lib/tasks). Worker, uygulamanın
// /api/tasks/generate ucunu düzenli tetikler (path-alias/db bağımlılığı olmadan).
// İleride BullMQ (Redis) ile daha zengin kuyruklar eklenebilir.
import "dotenv/config";

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const INTERVAL_MS = Number(process.env.FOLLOWUP_INTERVAL_MS ?? 60 * 60 * 1000); // 1 saat

async function tick() {
  try {
    const res = await fetch(`${BASE}/api/tasks/generate`, { method: "POST" });
    if (res.ok) {
      const { created } = await res.json();
      if (created > 0) console.log(`[worker] ${created} takip görevi üretildi.`);
    }
  } catch {
    // Uygulama henüz ayakta değilse sessizce geç; bir sonraki tur dener.
  }
}

async function main() {
  console.log(`[worker] DamgaPanel worker başladı — takip her ${INTERVAL_MS / 60000} dk.`);
  await tick();
  setInterval(tick, INTERVAL_MS);
}

main().catch((err) => {
  console.error("[worker] hata:", err);
  process.exit(1);
});

// Zarif kapanış.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log(`[worker] ${signal} alındı, kapanıyor.`);
    process.exit(0);
  });
}
