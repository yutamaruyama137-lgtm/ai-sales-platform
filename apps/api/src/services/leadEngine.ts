import nodemailer from 'nodemailer';
import { logger } from '../lib/logger.js';

// Webhook送信
export async function sendWebhook(webhookUrl: string, leadData: unknown): Promise<void> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData),
    });
    if (!response.ok) {
      logger.error(`Webhook failed: ${response.status}`, { webhookUrl });
    }
  } catch (err) {
    logger.error('Webhook error', err);
  }
}

// Gmail通知（nodemailer SMTP）
export async function sendEmailNotification(
  toEmail: string,
  leadData: { name?: string; email?: string; phone?: string; answers?: Record<string, string> }
): Promise<void> {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;

  if (!smtpUser || !smtpPass || !smtpHost) {
    logger.warn('SMTP settings not configured, skipping email notification');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort ?? 587),
      secure: false,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: smtpUser,
      to: toEmail,
      subject: `新しいリード: ${leadData.name ?? '名前未記入'}`,
      text: `
新しいリードが登録されました。

名前: ${leadData.name ?? '-'}
メール: ${leadData.email ?? '-'}
電話: ${leadData.phone ?? '-'}
回答: ${JSON.stringify(leadData.answers ?? {}, null, 2)}
      `.trim(),
    });
    logger.info('Email notification sent', { to: toEmail });
  } catch (err) {
    logger.error('Email notification error', err);
  }
}
