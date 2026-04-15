import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { getDb } from "@/db/client";
import { kycVerifications, processedStripeEvents, users } from "@/db/schema";
import type { ProvisionedAppUser } from "@/server/auth/provision";
import { assertAppUserActive } from "@/server/auth/provision";
import { env } from "@/lib/env";
import { getStripe } from "@/server/billing/stripe";

type AppUser = ProvisionedAppUser | null;

export async function createVerificationSession(user: AppUser) {
  assertAppUserActive(user);
  if (!user.id) {
    throw new Error("Unauthorized");
  }

  // Check if user already has a verified KYC row
  const existing = await getVerificationStatus(user.id);
  if (existing.status === "verified") {
    return { alreadyVerified: true as const, url: null, sessionId: null };
  }

  // If there's a pending session, check if it's still usable
  if (existing.status === "pending" && existing.stripeSessionId) {
    const stripe = getStripe();
    try {
      const existingSession = await stripe.identity.verificationSessions.retrieve(existing.stripeSessionId);
      if (existingSession.url && existingSession.status === "requires_input") {
        // Session is still active, reuse it
        return { alreadyVerified: false as const, url: existingSession.url, sessionId: existingSession.id };
      }
    } catch {
      // Session expired or invalid, create a new one
    }
  }

  const stripe = getStripe();
  const returnUrl = `${env.NEXT_PUBLIC_APP_URL}/verify/result`;

  const session = await stripe.identity.verificationSessions.create({
    type: "document",
    metadata: { user_id: user.id },
    options: {
      document: {
        require_matching_selfie: true,
      },
    },
    return_url: returnUrl,
  });

  const db = getDb();

  // Insert new KYC row
  const inserted = await db
    .insert(kycVerifications)
    .values({
      stripeSessionId: session.id,
      status: "pending",
    })
    .returning();

  const kycRow = inserted[0];
  if (!kycRow) {
    throw new Error("Failed to create KYC verification record.");
  }

  // Link it to the user
  await db
    .update(users)
    .set({ kycVerificationId: kycRow.id })
    .where(eq(users.id, user.id));

  return { alreadyVerified: false as const, url: session.url, sessionId: session.id };
}

export async function getVerificationStatus(userId: string) {
  const db = getDb();

  const rows = await db
    .select({
      status: kycVerifications.status,
      stripeSessionId: kycVerifications.stripeSessionId,
      verifiedFirstName: kycVerifications.verifiedFirstName,
      verifiedLastName: kycVerifications.verifiedLastName,
      verifiedDobDay: kycVerifications.verifiedDobDay,
      verifiedDobMonth: kycVerifications.verifiedDobMonth,
      verifiedDobYear: kycVerifications.verifiedDobYear,
      verifiedAddressCity: kycVerifications.verifiedAddressCity,
      verifiedAddressCountry: kycVerifications.verifiedAddressCountry,
      verifiedAt: kycVerifications.verifiedAt,
      lastErrorCode: kycVerifications.lastErrorCode,
      lastErrorReason: kycVerifications.lastErrorReason,
    })
    .from(users)
    .innerJoin(kycVerifications, eq(users.kycVerificationId, kycVerifications.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!rows[0]) {
    return { status: "not_started" as const, stripeSessionId: null };
  }

  return rows[0];
}

export async function isUserKycVerified(userId: string): Promise<boolean> {
  const status = await getVerificationStatus(userId);
  return status.status === "verified";
}

export async function processIdentityWebhookEvent(event: Stripe.Event) {
  const db = getDb();

  // Idempotency check
  const replay = await db
    .select()
    .from(processedStripeEvents)
    .where(eq(processedStripeEvents.eventId, event.id))
    .limit(1);

  if (replay[0]) {
    return { received: true, replayed: true };
  }

  const session = event.data.object as Stripe.Identity.VerificationSession;
  const stripeSessionId = session.id;

  // Find the KYC row by stripeSessionId
  const kycRows = await db
    .select()
    .from(kycVerifications)
    .where(eq(kycVerifications.stripeSessionId, stripeSessionId))
    .limit(1);

  const kycRow = kycRows[0];
  if (!kycRow) {
    // No matching KYC row — could be from a session we didn't create
    return { received: true, ignored: true };
  }

  if (event.type === "identity.verification_session.verified") {
    // Retrieve expanded session to get verified_outputs
    const stripe = getStripe();
    const expanded = await stripe.identity.verificationSessions.retrieve(stripeSessionId, {
      expand: ["verified_outputs"],
    });

    const outputs = expanded.verified_outputs;

    await db
      .update(kycVerifications)
      .set({
        status: "verified",
        verifiedFirstName: outputs?.first_name ?? null,
        verifiedLastName: outputs?.last_name ?? null,
        verifiedDobDay: outputs?.dob?.day ?? null,
        verifiedDobMonth: outputs?.dob?.month ?? null,
        verifiedDobYear: outputs?.dob?.year ?? null,
        verifiedAddressLine1: outputs?.address?.line1 ?? null,
        verifiedAddressLine2: outputs?.address?.line2 ?? null,
        verifiedAddressCity: outputs?.address?.city ?? null,
        verifiedAddressState: outputs?.address?.state ?? null,
        verifiedAddressPostalCode: outputs?.address?.postal_code ?? null,
        verifiedAddressCountry: outputs?.address?.country ?? null,
        verifiedIdNumber: outputs?.id_number ?? null,
        verifiedIdNumberType: outputs?.id_number_type ?? null,
        verifiedOutputsJson: outputs as unknown as Record<string, unknown> | null,
        verifiedAt: new Date(),
        lastErrorCode: null,
        lastErrorReason: null,
      })
      .where(eq(kycVerifications.id, kycRow.id));
  } else if (event.type === "identity.verification_session.requires_input") {
    await db
      .update(kycVerifications)
      .set({
        status: "requires_input",
        lastErrorCode: session.last_error?.code ?? null,
        lastErrorReason: session.last_error?.reason ?? null,
      })
      .where(eq(kycVerifications.id, kycRow.id));
  } else if (event.type === "identity.verification_session.canceled") {
    await db
      .update(kycVerifications)
      .set({ status: "canceled" })
      .where(eq(kycVerifications.id, kycRow.id));
  } else {
    return { received: true, ignored: true };
  }

  // Record processed event for idempotency
  const userId = session.metadata?.user_id;
  if (!userId) {
    // Cannot record without a valid user ID — but event was still processed
    return { received: true };
  }

  await db.insert(processedStripeEvents).values({
    eventId: event.id,
    sessionId: stripeSessionId,
    userId,
    packageId: "identity_verification",
    creditedTokens: 0,
    processedAt: new Date(),
  });

  return { received: true };
}
