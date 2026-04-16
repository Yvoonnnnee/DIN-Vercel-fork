import { CaseEditor } from "@/components/case-editor";
import { ensureAppUser } from "@/server/auth/provision";

export default async function NewCasePage() {
  const user = await ensureAppUser();
  return <CaseEditor mode="create" kycVerified={user?.kycVerified ?? false} />;
}
