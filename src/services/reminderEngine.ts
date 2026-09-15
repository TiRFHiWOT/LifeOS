import { createClient } from '@/lib/supabase/server';
import nodemailer, { Transporter } from 'nodemailer';

export interface ProactiveAgentAlert {
  eventId?: string;
  eventTitle: string;
  eventStartAt: string;
  unfinishedTasksCount: number;
  unfinishedTasks: string[];
  alertMessage: string;
}

export interface ProcessedReminderSummary {
  processedCount: number;
  successfulCount: number;
  failedCount: number;
  proactiveAlerts?: ProactiveAgentAlert[];
  details: { reminderId: string; status: 'sent' | 'failed'; recipient?: string; error?: string }[];
}

export async function generateProactiveAgentAlerts(
  userId: string,
  now: Date = new Date()
): Promise<ProactiveAgentAlert[]> {
  try {
    const supabase = await createClient();
    const next48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
    const nowISO = now.toISOString();

    const { data: upcomingEvents } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .gte('start_at', nowISO)
      .lte('start_at', next48Hours);

    const { data: activeTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('completed', false);

    if (!upcomingEvents || upcomingEvents.length === 0 || !activeTasks || activeTasks.length === 0) {
      return [];
    }

    const alerts: ProactiveAgentAlert[] = [];

    for (const event of upcomingEvents) {
      const eventLower = event.title.toLowerCase();
      const isTomorrow = new Date(event.start_at).getDate() !== now.getDate();
      const timeframeStr = isTomorrow ? 'tomorrow' : 'today';

      const relatedTasks = activeTasks.filter((t) => {
        const taskLower = t.title.toLowerCase();
        if (eventLower.includes('trip') || eventLower.includes('nairobi') || eventLower.includes('flight') || eventLower.includes('travel')) {
          return /(passport|packing|pack|document|ticket|reminder|hotel|visa|bag|travel|flight)/i.test(taskLower) || taskLower.includes(eventLower);
        }
        if (eventLower.includes('apartment') || eventLower.includes('mov')) {
          return /(landlord|truck|pack|box|internet|address|relocate|transport)/i.test(taskLower) || taskLower.includes(eventLower);
        }
        return taskLower.includes(eventLower) || eventLower.split(' ').some((w) => w.length > 3 && taskLower.includes(w));
      });

      if (relatedTasks.length > 0) {
        const unfinishedTitles = relatedTasks.map((t) => t.title);
        const alertMessage = `Your ${event.title} is ${timeframeStr}. You still have ${relatedTasks.length} preparation task${relatedTasks.length > 1 ? 's' : ''} unfinished.`;

        alerts.push({
          eventId: event.id,
          eventTitle: event.title,
          eventStartAt: event.start_at,
          unfinishedTasksCount: relatedTasks.length,
          unfinishedTasks: unfinishedTitles,
          alertMessage,
        });
      }
    }

    return alerts;
  } catch (err) {
    console.error('Failed to generate proactive agent alerts:', err);
    return [];
  }
}

export async function processDueReminders(): Promise<ProcessedReminderSummary> {
  const supabase = await createClient();
  const now = new Date();
  const nowISO = now.toISOString();

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

  // Generate proactive alerts for active users if dueReminders present
  let proactiveAlerts: ProactiveAgentAlert[] = [];
  if (dueReminders && dueReminders.length > 0) {
    const firstUserId = dueReminders[0].user_id;
    proactiveAlerts = await generateProactiveAgentAlerts(firstUserId, now);
  }

  if (!dueReminders || dueReminders.length === 0) {
    return { processedCount: 0, successfulCount: 0, failedCount: 0, proactiveAlerts: [], details: [] };
  }

  const summary: ProcessedReminderSummary = {
    processedCount: dueReminders.length,
    successfulCount: 0,
    failedCount: 0,
    proactiveAlerts,
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

      const userAlerts = proactiveAlerts.length > 0 ? proactiveAlerts : [];
      const proactivePrefix = userAlerts.length > 0 ? `[Proactive Agent Alert] ${userAlerts[0].alertMessage} ` : '';

      const subject = proactivePrefix
        ? `[LifeOS Agent Alert] ${userAlerts[0].alertMessage}`
        : task
        ? `[LifeOS Reminder] Task: ${task.title}`
        : event
        ? `[LifeOS Reminder] Event: ${event.title}`
        : '[LifeOS Reminder] Upcoming Item';

      let bodyText = '';
      if (userAlerts.length > 0) {
        const alertList = userAlerts.map((a) => `• ${a.alertMessage}\n  Unfinished tasks: ${a.unfinishedTasks.join(', ')}`).join('\n\n');
        bodyText += `--- LIFEOS PROACTIVE AGENT ALERTS ---\n${alertList}\n-------------------------------------\n\n`;
      }

      bodyText += task
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
        console.log(`[PROACTIVE AGENT REMINDER ENGINE DELIVERED] Reminder ${reminder.id} sent:`, { subject, bodyText });
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
