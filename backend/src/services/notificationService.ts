// backend/src/services/notificationService.ts
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { AppConfig } from '../types/config';

const prisma = new PrismaClient();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const notificationService = {
  async trigger(
    triggerName: string,
    appId: string,
    appConfig: AppConfig,
    context: Record<string, unknown>
  ) {
    if (!appConfig.notifications?.events?.length) return;

    const matchingEvents = appConfig.notifications.events.filter(event => {
      if (event.trigger !== triggerName) return false;
      if (event.entity && event.entity !== context.entityId) return false;
      return true;
    });

    for (const event of matchingEvents) {
      // Email notification
      if (event.email) {
        try {
          const subject = interpolate(event.email.subject, context);
          const body = event.email.body
            ? interpolate(event.email.body, context)
            : defaultEmailBody(triggerName, context);

          const to = Array.isArray(event.email.to) ? event.email.to : [event.email.to];

          if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            await transporter.sendMail({
              from: process.env.SMTP_USER,
              to: to.join(', '),
              subject,
              html: wrapInTemplate(body, appConfig.name),
            });
            await logNotification(appId, triggerName, context, 'email', 'sent', { subject, to });
          } else {
            // Mock Email - Log to console and DB
            console.log('📧 [MOCK EMAIL SENT]');
            console.log('To:', to.join(', '));
            console.log('Subject:', subject);
            console.log('Body:', body);
            await logNotification(appId, triggerName, context, 'email', 'mock_sent', { subject, to, body });
          }
        } catch (err) {
          await logNotification(appId, triggerName, context, 'email', 'failed', {}, String(err));
        }
      }

      // Webhook notification
      if (event.webhook) {
        try {
          await fetch(event.webhook.url, {
            method: event.webhook.method || 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(event.webhook.headers || {}),
            },
            body: JSON.stringify({ trigger: triggerName, app: appConfig.id, ...context }),
          });
          await logNotification(appId, triggerName, context, 'webhook', 'sent', { url: event.webhook.url });
        } catch (err) {
          await logNotification(appId, triggerName, context, 'webhook', 'failed', {}, String(err));
        }
      }
    }
  },
};

function interpolate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const record = context.record as Record<string, unknown> | undefined;
    const val = context[key] ?? record?.[key];
    return val !== undefined ? String(val) : `{{${key}}}`;
  });
}

function defaultEmailBody(trigger: string, context: Record<string, unknown>): string {
  return `
    <p>An event occurred in your app:</p>
    <p><strong>Trigger:</strong> ${trigger}</p>
    <p><strong>Entity:</strong> ${context.entityId || 'N/A'}</p>
    ${context.record ? `<p><strong>Record:</strong> <pre>${JSON.stringify(context.record, null, 2)}</pre></p>` : ''}
  `;
}

function wrapInTemplate(body: string, appName: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">${appName} Notification</h2>
        <hr>
        ${body}
        <hr>
        <p style="color: #999; font-size: 12px;">This is an automated notification from ${appName}.</p>
      </body>
    </html>
  `;
}

async function logNotification(
  appId: string,
  trigger: string,
  context: Record<string, unknown>,
  channel: string,
  status: string,
  payload: object,
  error?: string
) {
  await prisma.notificationLog.create({
    data: {
      appId,
      trigger,
      entityId: context.entityId as string | undefined,
      recordId: context.recordId as string | undefined,
      channel,
      status,
      payload,
      error,
    },
  }).catch(console.error);
}
