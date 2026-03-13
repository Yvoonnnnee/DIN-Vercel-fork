import { redirect } from "next/navigation";
import { ensureAppUser } from "@/server/auth/provision";
import { getRoleDashboardData } from "@/server/cases/queries";

export default async function DashboardPage() {
  const appUser = await ensureAppUser();
  const [claimant, respondent] = await Promise.all([
    getRoleDashboardData(appUser, "claimant"),
    getRoleDashboardData(appUser, "respondent"),
  ]);

  if (claimant.cases.length > 0 || claimant.stats.total > 0) {
    redirect("/claimant");
  }
  if (respondent.cases.length > 0 || respondent.stats.total > 0) {
    redirect("/respondent");
  }
  redirect("/claimant");
}
