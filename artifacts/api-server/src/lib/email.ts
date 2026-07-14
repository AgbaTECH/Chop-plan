import { ReplitConnectors } from "@replit/connectors-sdk";

// Fresh client per call -- tokens expire, never cache this.
function getConnectors(): ReplitConnectors {
  return new ReplitConnectors();
}

interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailArgs): Promise<void> {
  const connectors = getConnectors();
  const response = await connectors.proxy("resend", "/emails", {
    method: "POST",
    body: {
      from: "Chop Plan <updates@updates.chopplan.ng>",
      to: [to],
      subject,
      html,
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Resend email send failed (${response.status}): ${text}`);
  }
}

export function otpEmailHtml(code: string, purpose: "verify" | "reset"): string {
  const heading = purpose === "verify" ? "Verify your Chop Plan account" : "Reset your Chop Plan password";
  const body = purpose === "verify"
    ? "Enter this code to verify your account:"
    : "Enter this code to reset your password:";
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>${heading}</h2>
      <p>${body}</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${code}</p>
      <p style="color: #666; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
    </div>
  `;
}
