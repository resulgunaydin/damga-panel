import { prisma } from "@/lib/prisma";
import { RandevuTakvimi } from "@/components/randevu/randevu-takvimi";

export const dynamic = "force-dynamic";

export default async function RandevularPage() {
  const appointments = await prisma.appointment.findMany({
    orderBy: { scheduledAt: "asc" },
    include: { business: { select: { id: true, name: true } } },
  });

  return (
    <main className="mx-auto flex min-h-full w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Randevular</h1>
        <p className="text-muted-foreground text-sm">
          {appointments.length} randevu · sunumu beğenen firmalarla planlanan görüşmeler
        </p>
      </div>
      <RandevuTakvimi
        appointments={appointments.map((a) => ({
          id: a.id,
          scheduledAt: a.scheduledAt.toISOString(),
          location: a.location,
          note: a.note,
          status: a.status,
          business: a.business,
        }))}
      />
    </main>
  );
}
