import sgMail from '@sendgrid/mail';
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

// メール通知（SendGrid API）
export async function sendEmailNotification(
  toEmail: string,
  leadData: {
    name?: string;
    email?: string;
    phone?: string;
    answers?: Record<string, string>;
    clientName?: string;
    sourcePage?: string;
  }
): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    logger.warn('SENDGRID_API_KEY or SENDGRID_FROM_EMAIL not configured, skipping email notification');
    return;
  }

  sgMail.setApiKey(apiKey);
  const clientLabel = leadData.clientName ? `【${leadData.clientName}】` : '';

  const answersHtml = Object.entries(leadData.answers ?? {})
    .filter(([k]) => k !== 'source' && k !== 'line_user_id')
    .map(([k, v]) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;color:#666;width:120px">${k}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0">${v}</td></tr>`)
    .join('');

  const html = `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
  <div style="background:#2563eb;padding:18px 24px">
    <h2 style="margin:0;color:#fff;font-size:16px">新しいリードが登録されました</h2>
    ${leadData.clientName ? `<p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px">${leadData.clientName}</p>` : ''}
  </div>
  <div style="padding:20px 24px">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;color:#666;width:120px">名前</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0">${leadData.name ?? '-'}</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;color:#666">メール</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0">${leadData.email ? `<a href="mailto:${leadData.email}">${leadData.email}</a>` : '-'}</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;color:#666">電話</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0">${leadData.phone ?? '-'}</td></tr>
      ${answersHtml}
      ${leadData.sourcePage ? `<tr><td style="padding:6px 12px;color:#666">流入ページ</td><td style="padding:6px 12px;font-size:12px;color:#94a3b8">${leadData.sourcePage}</td></tr>` : ''}
    </table>
  </div>
  <div style="padding:12px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8">
    このメールは AI Sales Platform から自動送信されています
  </div>
</div>`.trim();

  try {
    await sgMail.send({
      from: `AI Sales Platform <${fromEmail}>`,
      to: toEmail,
      subject: `${clientLabel}新しいリード: ${leadData.name ?? '名前未記入'}`,
      html,
    });

    logger.info('Email notification sent', { to: toEmail });
  } catch (err) {
    logger.error('Email notification error', err);
    throw err;
  }
}
