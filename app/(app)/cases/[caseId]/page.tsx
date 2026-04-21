import { notFound, redirect } from "next/navigation";
import { ensureAppUser } from "@/server/auth/provision";
import { getCaseDetail } from "@/server/cases/queries";
import { getDb } from "@/db/client";
import { cases, hearings, lawyerConversations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CaseDetailWorkspace } from "@/components/case-detail-workspace";
import { linkRespondentIfMatching } from "@/server/identity/service";

type CaseDetailPageProps = {
  params: Promise<{ caseId: string }>;
};

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { caseId } = await params;
  const appUser = await ensureAppUser();
  
  // First check if user is admin/moderator for fallback access
  const isAdminOrModerator = appUser?.role === "admin" || appUser?.role === "moderator";
  
  let detail = await getCaseDetail(appUser, caseId);
  
  if (!detail && isAdminOrModerator) {
    // Admin/moderator fallback: get basic case info directly
    const db = getDb();
    const caseRows = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
    const hearingRows = await db.select().from(hearings).where(eq(hearings.caseId, caseId));
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
      hearings: hearingRows,
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

  // Opportunistic respondent linking: when the verified respondent views their
  // own case for the first time, auto-link the case to the verified user.
  if (
    appUser?.id &&
    appUser.kycVerified &&
    !detail.case.respondentUserId &&
    detail.role === "respondent"
  ) {
    try {
      const { linked } = await linkRespondentIfMatching(caseId, appUser.id);
      if (linked) {
        // Refresh detail so the banner reflects the new state.
        detail = (await getCaseDetail(appUser, caseId)) ?? detail;
      }
    } catch (err) {
      console.error("linkRespondentIfMatching (page) failed", err);
    }
  }

  if (detail.role === "respondent" && !detail.case.respondentLawyerKey) {
    redirect(`/cases/${caseId}/select-lawyer`);
  }

  return <CaseDetailWorkspace detail={detail} userRole={appUser?.role} user={appUser} />;
}
