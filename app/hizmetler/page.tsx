import { prisma } from "@/lib/prisma";
import { ServicesManager } from "@/components/settings/services-manager";

export const dynamic = "force-dynamic";

export default async function HizmetlerPage() {
  const services = await prisma.serviceCatalog.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return (
    <ServicesManager
      initial={services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        active: s.active,
      }))}
    />
  );
}
