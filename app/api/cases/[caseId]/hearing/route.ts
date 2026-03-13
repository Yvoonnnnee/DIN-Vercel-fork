import { fail, ok } from "@/server/api/responses";
import { ensureAppUser } from "@/server/auth/provision";
import { scheduleHearing } from "@/server/cases/mutations";

type RouteProps = {
  params: Promise<{ caseId: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  try {
    const { caseId } = await params;
    const user = await ensureAppUser();
    const body = await request.json();
    return ok(await scheduleHearing(user, caseId, body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to schedule hearing";
    const status = message === "Forbidden" ? 403 : 400;
    return fail("HEARING_SCHEDULE_FAILED", message, status);
  }
}
