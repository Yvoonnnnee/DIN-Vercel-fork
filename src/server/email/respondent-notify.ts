import { Resend } from "resend";
import { env } from "@/lib/env";

type CaseRow = {
  id: string;
  title: string;
  caseNumber: string;
  claimantName: string | null;
  respondentName: string | null;
};

export async function sendRespondentNotifyEmail(to: string, caseItem: CaseRow) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    throw new Error(
      "Email is not configured. Set RESEND_API_KEY and EMAIL_FROM (verified sender in Resend).",
    );
  }

  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const caseUrl = `${base}/cases/${caseItem.id}`;

  const resend = new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: [to],
    subject: `${caseItem.caseNumber}: you are named as respondent — ${caseItem.title}`,
    html: [
      `<p>Hello${caseItem.respondentName ? ` ${caseItem.respondentName}` : ""},</p>`,
      `<p>You have been named as the respondent in arbitration case <strong>${caseItem.caseNumber}</strong>: <strong>${caseItem.title}</strong>.</p>`,
      caseItem.claimantName
        ? `<p>The claimant is recorded as <strong>${caseItem.claimantName}</strong>.</p>`
        : "",
      `<p><a href="${caseUrl}">Open the case workspace</a> to review and respond.</p>`,
      "<p>This message was sent by the arbitration platform. If you were not expecting it, you can ignore it or contact the claimant.</p>",
    ].join("\n"),
  });

  if (error) {
    throw new Error(error.message);
  }
}
