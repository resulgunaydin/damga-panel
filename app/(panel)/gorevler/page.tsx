import { generateFollowUpTasks, listActiveTasks } from "@/lib/tasks";
import { GorevKutusu } from "@/components/tasks/gorev-kutusu";

export const dynamic = "force-dynamic";

export default async function GorevlerPage() {
  // Sayfa açılınca sessizlik sayaçlarını değerlendirip görev üret (Bölüm 4.10).
  await generateFollowUpTasks();
  const tasks = await listActiveTasks();

  return (
    <GorevKutusu
      initial={tasks.map((t) => ({
        id: t.id,
        title: t.title,
        kind: t.kind,
        dueAt: t.dueAt ? t.dueAt.toISOString() : null,
        business: t.business ? { id: t.business.id, name: t.business.name } : null,
      }))}
    />
  );
}
