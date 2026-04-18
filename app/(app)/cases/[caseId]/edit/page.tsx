import { notFound } from "next/navigation";
import { ensureAppUser } from "@/server/auth/provision";
import { getCaseDetail } from "@/server/cases/queries";
import { getDb } from "@/db/client";
import { cases, lawyerConversations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CaseEditor } from "@/components/case-editor";
import { getVerificationStatus } from "@/server/identity/service";

type EditCasePageProps = {
  params: Promise<{ caseId: string }>;
};

export default async function EditCasePage({ params }: EditCasePageProps) {
  const { caseId } = await params;
  const appUser = await ensureAppUser();
  
  // Check if user is admin/moderator for fallback access
  const isAdminOrModerator = appUser?.role === "admin" || appUser?.role === "moderator";
  
  let detail = await getCaseDetail(appUser, caseId);
  
  if (!detail && isAdminOrModerator) {
    // Admin/moderator fallback: get basic case info directly
    const db = getDb();
    const caseRows = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
    const caseItem = caseRows[0];
    
    if (!caseItem) {
      notFound();
    }
    
    // Get actual conversation data for admin access
    const conversationRows = await db.select().from(lawyerConversations).where(eq(lawyerConversations.caseId, caseId));
        
    // Create minimal detail object for admin access
    detail = {
      case: caseItem,
      role: appUser.role as 'admin' | 'moderator',
      roleLabel: appUser.role === 'admin' ? 'Admin' : 'Moderator',
      evidence: [],
      witnesses: [],
      consultants: [],
      activities: [],
      expertiseRequests: [],
      messages: [],
      conversation: conversationRows[0] ?? null,
      hearings: [],
      audits: [],
      claimantKyc: null,
      respondentKyc: null,
      todoItems: [],
      progressStages: [],
      summaryCards: [],
    };
  }

  if (!detail) {
    notFound();
  }

  let claimantPrefill: { name: string; locked: boolean } | null = null;
  if (appUser?.id && appUser.kycVerified) {
    const status = await getVerificationStatus(appUser.id);
    if ("verifiedFirstName" in status) {
      const name = `${status.verifiedFirstName ?? ""} ${status.verifiedLastName ?? ""}`.trim();
      if (name) {
        claimantPrefill = { name, locked: true };
      }
    }
  }

  return (
    <CaseEditor
      mode="edit"
      initialCase={detail.case}
      kycVerified={appUser?.kycVerified ?? false}
      claimantPrefill={claimantPrefill}
    />
  );
}
