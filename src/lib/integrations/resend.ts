import { hasResend, env } from "@/lib/env";

export type FlaggedCallAlertInput = {
  toEmails: string[];
  leadName: string;
  associateName: string;
  callId: string;
  riskLevel: "needs_review" | "high_fabrication_risk";
  rationale: string;
  reviewUrl: string;
};

/**
 * Sends a flagged-call alert to QA managers via Resend. Logs to the console
 * instead of sending when RESEND_API_KEY is unset, so the notify step of the
 * pipeline still completes without an email account.
 */
export async function sendFlaggedCallAlert(input: FlaggedCallAlertInput): Promise<{ sent: boolean }> {
  const subject = `[${input.riskLevel === "high_fabrication_risk" ? "High risk" : "Needs review"}] Call flagged — ${input.associateName} × ${input.leadName}`;
  const html = `
    <p><strong>${input.associateName}</strong>'s call with <strong>${input.leadName}</strong> was flagged as <strong>${input.riskLevel.replace(/_/g, " ")}</strong>.</p>
    <p>${input.rationale}</p>
    <p><a href="${input.reviewUrl}">Open the review queue</a></p>
  `;

  if (!hasResend || input.toEmails.length === 0) {
    console.log(`[resend:mock] would email ${input.toEmails.join(", ") || "(no recipients configured)"}: ${subject}`);
    return { sent: false };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "CallIQ Alerts <alerts@calliq.app>",
      to: input.toEmails,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend send failed: ${res.status} ${await res.text()}`);
  }
  return { sent: true };
}
