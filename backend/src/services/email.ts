import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { escapeHtml } from "../lib/escape";

const transporter = env.smtp.host
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    })
  : null;

export const isEmailConfigured = Boolean(transporter);

// Plain-text message in, branded HTML email out. Without SMTP settings the
// email is logged instead, and the result says so.
export async function sendEmail(to: string, subject: string, message: string, fromName?: string) {
  if (!transporter) {
    logger.info(`[email] SMTP not configured — would send "${subject}" to ${to}`);
    return { delivered: false, simulated: true };
  }
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#18181b">
    <div style="font-weight:700;font-size:18px;margin-bottom:16px">${escapeHtml(fromName || "AutoFlow")}</div>
    <div style="font-size:15px;line-height:1.6;white-space:pre-wrap">${escapeHtml(message)}</div>
  </div>`;
  const fromAddress = env.smtp.from;
  await transporter.sendMail({
    from: fromName ? `${fromName.replace(/[<>"]/g, "")} via AutoFlow <${fromAddress.match(/<(.+)>/)?.[1] || fromAddress}>` : fromAddress,
    to,
    subject,
    text: message,
    html,
  });
  return { delivered: true, simulated: false };
}
