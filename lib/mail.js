import nodemailer from "nodemailer";

let transporter = null;

function getSmtpConfig() {
  const host = process.env.MAIL_HOST || process.env.SMTP_HOST;
  const port = Number(process.env.MAIL_PORT || process.env.SMTP_PORT || 587);
  const user =
    process.env.MAIL_USERNAME || process.env.SMTP_USER || process.env.MAIL_FROM_ADDRESS;
  const pass = process.env.MAIL_PASSWORD || process.env.SMTP_PASS;
  const encryption = String(process.env.MAIL_ENCRYPTION || "tls").toLowerCase();

  return { host, port, user, pass, encryption };
}

function getTransporter() {
  if (transporter) return transporter;

  const { host, port, user, pass, encryption } = getSmtpConfig();

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: encryption === "ssl" || port === 465,
    auth: { user, pass },
  });

  return transporter;
}

export function getDefaultFromName() {
  return process.env.MAIL_FROM_NAME || "OHS Portal Scheduler";
}

export function getDefaultFromEmail() {
  const { user } = getSmtpConfig();
  return process.env.MAIL_FROM_ADDRESS || user || "";
}

/**
 * Padanan MailApp.sendEmail(options)
 */
export async function sendEmail(options) {
  const transport = getTransporter();

  if (!transport) {
    throw new Error(
      "SMTP belum dikonfigurasi. Set MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD (atau SMTP_HOST, SMTP_USER, SMTP_PASS)."
    );
  }

  const fromName = options.name || getDefaultFromName();
  const fromEmail = getDefaultFromEmail();

  await transport.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: options.to,
    cc: options.cc || undefined,
    bcc: options.bcc || undefined,
    subject: options.subject,
    text: options.body,
    html: options.htmlBody,
  });
}

export function getRemainingDailyQuota() {
  return null;
}
