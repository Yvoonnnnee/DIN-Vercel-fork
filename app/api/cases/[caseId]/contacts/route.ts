import { fail, ok } from "@/server/api/responses";
import { ensureAppUser } from "@/server/auth/provision";
import { updateCaseContacts } from "@/server/cases/mutations";

type RouteProps = {
  params: Promise<{ caseId: string }>;
};

export async function PATCH(request: Request, { params }: RouteProps) {
  try {
    const { caseId } = await params;
    const user = await ensureAppUser();
    const body = await request.json();
    return ok(await updateCaseContacts(user, caseId, body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update contacts";
    const status = message === "Forbidden" ? 403 : 400;
    return fail("CASE_CONTACTS_UPDATE_FAILED", message, status);
  }
}

