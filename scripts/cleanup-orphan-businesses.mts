// Öksüz firma temizliği.
//
// Arama silme eskiden SetNull'dı: alan silinince firmalar searchId=null ile
// veritabanında kalıyordu. Segment listesi onları göstermiyor (searchId ile
// filtreliyor) ama placeId dedup'ı "zaten var" sayıp yeniden taramada
// atlıyordu — yani o firmalar bir daha asla çıkmıyordu. Silme artık Cascade,
// bu script eski kalıntıları temizler.
//
// Sadece EL DEĞMEMİŞ öksüzler silinir. Üzerinde iş yapılmış olanlar
// (çalışma listesi, müşteri, analiz, sunum, arama kaydı…) korunur: onlar
// panelde hâlâ görünür, dolayısıyla dedup'ın onları engellemesi doğrudur.
// Kara listedekiler de korunur — dedup'ı engellemeleri zaten amaçlarıdır.
// (Üzerinde iş yapılmış bir firmanın hep bir izi olur: sunum/analiz/görev vb.)
//
// Kuru çalışma:  npx tsx scripts/cleanup-orphan-businesses.mts
// Gerçek silme:  npx tsx scripts/cleanup-orphan-businesses.mts --apply
import "dotenv/config";
import { prisma } from "../lib/prisma";

const apply = process.argv.includes("--apply");

// El değmemiş öksüz: hiçbir aramaya bağlı değil, elle eklenmemiş ve
// üzerinde hiçbir kullanıcı işi/kaydı yok.
const untouchedOrphan = {
  searchId: null,
  manualAdded: false,
  blacklisted: false,
  inWorkList: false,
  inCallList: false,
  customer: { is: null },
  analyses: { none: {} },
  messages: { none: {} },
  presentations: { none: {} },
  activities: { none: {} },
  tasks: { none: {} },
  calls: { none: {} },
  appointments: { none: {} },
} as const;

const orphanTotal = await prisma.business.count({ where: { searchId: null } });
const manual = await prisma.business.count({
  where: { searchId: null, manualAdded: true },
});
const targets = await prisma.business.findMany({
  where: untouchedOrphan,
  select: { id: true, name: true, phone: true },
  orderBy: { createdAt: "asc" },
});
const kept = orphanTotal - manual - targets.length;

console.log(`Öksüz firma (searchId=null) : ${orphanTotal}`);
console.log(`  elle eklenen (korunur)    : ${manual}`);
console.log(`  iş yapılmış (korunur)     : ${kept}`);
console.log(`  el değmemiş (silinecek)   : ${targets.length}`);

if (targets.length > 0) {
  console.log("\nSilinecekler:");
  for (const b of targets.slice(0, 20)) {
    console.log(`  - ${b.name}${b.phone ? ` (${b.phone})` : ""}`);
  }
  if (targets.length > 20) console.log(`  … ve ${targets.length - 20} tane daha`);
}

if (!apply) {
  console.log(
    targets.length > 0
      ? "\nKuru çalışma — hiçbir şey silinmedi. Silmek için: --apply"
      : "\nTemizlenecek öksüz kayıt yok.",
  );
} else if (targets.length === 0) {
  console.log("\nTemizlenecek öksüz kayıt yok.");
} else {
  const { count } = await prisma.business.deleteMany({ where: untouchedOrphan });
  console.log(`\n${count} öksüz firma silindi. Bu firmalar artık yeniden taramada tekrar çıkabilir.`);
}

await prisma.$disconnect();
