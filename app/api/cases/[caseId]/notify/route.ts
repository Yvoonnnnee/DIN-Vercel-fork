import { fail, ok } from "@/server/api/responses";
import { ensureAppUser } from "@/server/auth/provision";
import { notifyRespondent } from "@/server/cases/mutations";

type RouteProps = {
  params: Promise<{ caseId: string }>;
};

export async function POST(_: Request, { params }: RouteProps) {
  try {
    const { caseId } = await params;
    const user = await ensureAppUser();
    return ok(await notifyRespondent(user, caseId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to notify respondent";
    const status = message === "Forbidden" ? 403 : 400;
    return fail("NOTIFY_RESPONDENT_FAILED", message, status);
  }
}
