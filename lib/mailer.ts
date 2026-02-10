import nodemailer from 'nodemailer';

export interface MailerConfig {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
}

function getMailerConfig(): MailerConfig {
  return {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM,
  };
}

export function isMailerConfigured(): boolean {
  const config = getMailerConfig();
  return !!(config.host && config.port && config.user && config.pass && config.from);
}

export async function sendBulkEmail(
  recipients: string[],
  subject: string,
  html: string
): Promise<{ sent: number; skipped: number }> {
  if (!isMailerConfigured()) {
    return { sent: 0, skipped: recipients.length };
  }

  const config = getMailerConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  const batchSize = 100;
  let sent = 0;

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    await transporter.sendMail({
      from: config.from,
      to: config.from,
      bcc: batch,
      subject,
      html,
    });
    sent += batch.length;
  }

  return { sent, skipped: 0 };
}
