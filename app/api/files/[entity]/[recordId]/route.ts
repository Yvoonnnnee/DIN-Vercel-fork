import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { caseMessages, consultants, evidence, expertiseRequests, witnesses } from "@/db/schema";
import { ensureAppUser } from "@/server/auth/provision";
import { getAuthorizedCase } from "@/server/cases/mutations";

type RouteProps = {
  params: Promise<{ entity: string; recordId: string }>;
};

export async function GET(request: Request, { params }: RouteProps) {
  const { entity, recordId } = await params;
  const requestUrl = new URL(request.url);
  const index = Number(requestUrl.searchParams.get("index") || "0");
  const user = await ensureAppUser();
  const db = getDb();

  if (entity === "evidence") {
    const rows = await db.select().from(evidence).where(eq(evidence.id, recordId)).limit(1);
    const record = rows[0];
    if (!record?.fileUrl) {
      return new Response("Not found", { status: 404 });
    }
    const authorized = await getAuthorizedCase(user, record.caseId);
    if (!authorized) {
      return new Response("Forbidden", { status: 403 });
    }
    return NextResponse.redirect(record.fileUrl);
  }

  if (entity === "witnesses") {
    const rows = await db.select().from(witnesses).where(eq(witnesses.id, recordId)).limit(1);
    const record = rows[0];
    if (!record?.statementFileUrl) {
      return new Response("Not found", { status: 404 });
    }
    const authorized = await getAuthorizedCase(user, record.caseId);
    if (!authorized) {
      return new Response("Forbidden", { status: 403 });
    }
    return NextResponse.redirect(record.statementFileUrl);
  }

  if (entity === "consultants") {
    const rows = await db.select().from(consultants).where(eq(consultants.id, recordId)).limit(1);
    const record = rows[0];
    if (!record?.reportFileUrl) {
      return new Response("Not found", { status: 404 });
    }
    const authorized = await getAuthorizedCase(user, record.caseId);
    if (!authorized) {
      return new Response("Forbidden", { status: 403 });
    }
    return NextResponse.redirect(record.reportFileUrl);
  }

  if (entity === "messages") {
    const rows = await db.select().from(caseMessages).where(eq(caseMessages.id, recordId)).limit(1);
    const record = rows[0];
    if (!record?.attachmentUrl) {
      return new Response("Not found", { status: 404 });
    }
    const authorized = await getAuthorizedCase(user, record.caseId);
    if (!authorized) {
      return new Response("Forbidden", { status: 403 });
    }
    return NextResponse.redirect(record.attachmentUrl);
  }

  if (entity === "expertise") {
    const rows = await db.select().from(expertiseRequests).where(eq(expertiseRequests.id, recordId)).limit(1);
    const record = rows[0];
    const attachments = Array.isArray(record?.fileReferences) ? record.fileReferences : [];
    const selected = attachments[index] as { url?: string } | undefined;
    if (!selected?.url || !record) {
      return new Response("Not found", { status: 404 });
    }
    const authorized = await getAuthorizedCase(user, record.caseId);
    if (!authorized) {
      return new Response("Forbidden", { status: 403 });
    }
    return NextResponse.redirect(selected.url);
  }

  return new Response("Not found", { status: 404 });
}
