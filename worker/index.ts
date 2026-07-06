// DamgaPanel — arka plan worker süreci.
// Görevi: grid tarama ve takip otomasyonu kuyruklarını (BullMQ/Redis) yürütmek.
// Kuyruklar #19 "Takip Otomasyonu + Görev Kutusu" issue'sunda bağlanacak.
import "dotenv/config";

async function main() {
  console.log("[worker] DamgaPanel worker başladı.");
  // TODO(#19): BullMQ kuyrukları (grid tarama, sessizlik sayaçları) burada tanımlanacak.
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
