import { fail, ok } from "@/server/api/responses";
import { ensureAppUser } from "@/server/auth/provision";
import { createWitness } from "@/server/cases/mutations";

type RouteProps = {
  params: Promise<{ caseId: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  try {
    const { caseId } = await params;
    const user = await ensureAppUser();
    const body = await request.json();
    const record = await createWitness(user, caseId, body);
    return ok(record, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create witness";
    const status = message === "Forbidden" ? 403 : 400;
    return fail("WITNESS_CREATE_FAILED", message, status);
  }
}
