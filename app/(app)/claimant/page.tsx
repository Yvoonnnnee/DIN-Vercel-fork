import { ensureAppUser } from "@/server/auth/provision";
import { getRoleDashboardData } from "@/server/cases/queries";
import { getTokenBalance } from "@/server/billing/service";
import { isDatabaseConfigured } from "@/server/runtime";
import { RoleDashboard } from "@/components/role-dashboard";

export default async function ClaimantDashboardPage() {
  const user = await ensureAppUser();
  const data = await getRoleDashboardData(user, "claimant");
  const balance = user?.id && isDatabaseConfigured() ? await getTokenBalance(user.id) : 0;

  return <RoleDashboard role="claimant" balance={balance} data={data} />;
}
