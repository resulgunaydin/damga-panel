import { getUsageSummary } from "@/lib/quota";
import { LimitsSettings } from "@/components/settings/limits-settings";

export const dynamic = "force-dynamic";

export default async function LimitlerAyarPage() {
  const summary = await getUsageSummary();
  return (
    <LimitsSettings
      initial={{
        caps: summary.caps,
        todayTotal: summary.todayTotal,
        monthTotal: summary.monthTotal,
        monthLabel: summary.monthLabel,
      }}
    />
  );
}
