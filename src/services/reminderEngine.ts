import { createClient } from '@/lib/supabase/server';
import nodemailer, { Transporter } from 'nodemailer';

export interface ProcessedReminderSummary {
  processedCount: number;
  successfulCount: number;
  failedCount: number;
  details: { reminderId: string; status: 'sent' | 'failed'; recipient?: string; error?: string }[];
}

export async function processDueReminders(): Promise<ProcessedReminderSummary> {
  const supabase = await createClient();
  const nowISO = new Date().toISOString();

  // Fetch pending reminders due at or before now
  const { data: dueReminders, error } = await supabase
    .from('reminders')
    .select(`
      id,
      user_id,
      task_id,
      event_id,
      remind_at,
      status,
      tasks ( id, title, description, due_at ),
      events ( id, title, description, start_at, end_at )
    `)
    .eq('status', 'pending')
    .lte('remind_at', nowISO);

  if (error) {
    throw new Error(`Failed to fetch due reminders: ${error.message}`);
  }

  if (!dueReminders || dueReminders.length === 0) {
    return { processedCount: 0, successfulCount: 0, failedCount: 0, details: [] };
  }

  const summary: ProcessedReminderSummary = {
    processedCount: dueReminders.length,
    successfulCount: 0,
    failedCount: 0,
    details: [],
  };

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromEmail = process.env.EMAIL_FROM || 'notifications@lifeos.local';

  let transporter: Transporter | null = null;
  if (smtpHost && smtpUser && smtpPass) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });
  }

  for (const reminder of dueReminders) {
    try {
      // 1. Guard against duplicate processing: update status to 'sent' immediately
      const { error: updateErr } = await supabase
        .from('reminders')
        .update({ status: 'sent' })
        .eq('id', reminder.id)
        .eq('status', 'pending');

      if (updateErr) {
        summary.failedCount++;
        summary.details.push({ reminderId: reminder.id, status: 'failed', error: updateErr.message });
        continue;
      }

      // 2. Determine details (task or event)
      const task = Array.isArray(reminder.tasks) ? reminder.tasks[0] : reminder.tasks;
      const event = Array.isArray(reminder.events) ? reminder.events[0] : reminder.events;

      const subject = task
        ? `[LifeOS Reminder] Task: ${task.title}`
        : event
        ? `[LifeOS Reminder] Event: ${event.title}`
        : '[LifeOS Reminder] Upcoming Item';

      const bodyText = task
        ? `Reminder for your task: "${task.title}".\nDue: ${task.due_at || 'No due date'}\n${task.description || ''}`
        : event
        ? `Reminder for your upcoming event: "${event.title}".\nStart: ${event.start_at}\nEnd: ${event.end_at}\n${event.description || ''}`
        : 'You have a scheduled LifeOS reminder.';

      // 3. Deliver Email if transporter configured, or mark as sent
      if (transporter) {
        const { data: userData } = await supabase.auth.admin.getUserById(reminder.user_id).catch(() => ({ data: null }));
        const recipientEmail = userData?.user?.email || `user_${reminder.user_id.slice(0, 8)}@lifeos.local`;

        await transporter.sendMail({
          from: fromEmail,
          to: recipientEmail,
          subject,
          text: bodyText,
        });

        summary.successfulCount++;
        summary.details.push({ reminderId: reminder.id, status: 'sent', recipient: recipientEmail });
      } else {
        console.log(`[REMINDER ENGINE DELIVERED] Reminder ${reminder.id} sent:`, { subject, bodyText });
        summary.successfulCount++;
        summary.details.push({ reminderId: reminder.id, status: 'sent', recipient: 'console_demo' });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Notification dispatch failed';
      console.error(`Failed to dispatch reminder ${reminder.id}:`, err);

      await supabase
        .from('reminders')
        .update({ status: 'failed' })
        .eq('id', reminder.id);

      summary.failedCount++;
      summary.details.push({ reminderId: reminder.id, status: 'failed', error: errMsg });
    }
  }

  return summary;
}
