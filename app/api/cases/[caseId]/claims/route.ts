import { fail, ok } from "@/server/api/responses";
import { ensureAppUser } from "@/server/auth/provision";
import { updateCaseClaims } from "@/server/cases/mutations";

type RouteProps = {
  params: Promise<{ caseId: string }>;
};

export async function PATCH(request: Request, { params }: RouteProps) {
  try {
    const { caseId } = await params;
    const user = await ensureAppUser();
    const body = await request.json();
    return ok(await updateCaseClaims(user, caseId, body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update claims";
    const status = message === "Forbidden" ? 403 : 400;
    return fail("CLAIMS_UPDATE_FAILED", message, status);
  }
}
