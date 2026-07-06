import { getUsageSummary } from "@/lib/quota";
import { UsageDashboard } from "@/components/usage/usage-dashboard";

export const dynamic = "force-dynamic";

export default async function KullanimPage() {
  const summary = await getUsageSummary();
  return <UsageDashboard initial={summary} />;
}
