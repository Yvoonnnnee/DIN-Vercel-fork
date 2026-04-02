import { fail, ok } from "@/server/api/responses";
import { ensureAppUser } from "@/server/auth/provision";
import { scheduleHearing } from "@/server/cases/mutations";
import { getDb } from "@/db/client";
import { cases, hearings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

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

export async function PATCH(request: Request, { params }: RouteProps) {
  try {
    const { caseId } = await params;
    const user = await ensureAppUser();
    const body = await request.json();
    
    const db = getDb();
    
    // Check if this is an update to existing hearing or creating a new one
    if (body.hearingId) {
      // Update existing hearing
      await db.update(hearings)
        .set({
          scheduledStartTime: body.hearingDate ? new Date(body.hearingDate) : undefined,
          meetingUrl: body.meetingUrl,
          status: body.status || 'scheduled',
          updatedAt: new Date(),
        })
        .where(and(
          eq(hearings.id, body.hearingId),
          eq(hearings.caseId, caseId)
        ));
        
      return ok({ success: true, message: "Hearing updated successfully" });
    } else {
      // Create new hearing record
      const hearingId = randomUUID();
      await db.insert(hearings).values({
        id: hearingId,
        caseId,
        scheduledStartTime: body.hearingDate ? new Date(body.hearingDate) : new Date(),
        scheduledEndTime: body.endTime ? new Date(body.endTime) : undefined,
        meetingUrl: body.meetingUrl,
        meetingPlatform: body.meetingPlatform || 'google_meet',
        meetingId: body.meetingId,
        status: body.status || 'scheduled',
        phase: 'pre_hearing',
        isRecording: 'false',
        isTranscribing: 'true',
        autoTranscribe: 'true',
      });
      
      // Update case status to show hearing is scheduled
      await db.update(cases)
        .set({
          status: 'hearing_scheduled',
          updatedAt: new Date(),
        })
        .where(eq(cases.id, caseId));
        
      return ok({ 
        success: true, 
        message: "Hearing created successfully",
        hearingId 
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update hearing";
    return fail("HEARING_UPDATE_FAILED", message, 400);
  }
}
