import { notFound } from "next/navigation";
import { ensureAppUser } from "@/server/auth/provision";
import { getCaseDetail } from "@/server/cases/queries";
import { CaseEditor } from "@/components/case-editor";

type EditCasePageProps = {
  params: Promise<{ caseId: string }>;
};

export default async function EditCasePage({ params }: EditCasePageProps) {
  const { caseId } = await params;
  const appUser = await ensureAppUser();
  const detail = await getCaseDetail(appUser, caseId);

  if (!detail) {
    notFound();
  }

  return <CaseEditor mode="edit" initialCase={detail.case} />;
}
