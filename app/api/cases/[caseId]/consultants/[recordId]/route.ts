import { fail, ok } from "@/server/api/responses";
import { ensureAppUser } from "@/server/auth/provision";
import { deleteConsultant } from "@/server/cases/mutations";

type RouteProps = {
  params: Promise<{ caseId: string; recordId: string }>;
};

export async function DELETE(_: Request, { params }: RouteProps) {
  try {
    const { caseId, recordId } = await params;
    const user = await ensureAppUser();
    await deleteConsultant(user, caseId, recordId);
    return ok({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete consultant";
    const status = message === "Forbidden" ? 403 : 400;
    return fail("CONSULTANT_DELETE_FAILED", message, status);
  }
}
