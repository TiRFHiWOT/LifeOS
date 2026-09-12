import { AIInterpretationResult, AIChoice } from '@/types/ai';
import { createTask } from '@/services/tasks';
import { createNote } from '@/services/notes';
import { createEvent } from '@/services/events';
import { createReminder } from '@/services/reminders';
import { createGoogleCalendarEvent } from '@/services/googleCalendar';

export interface ActionResult {
  success: boolean;
  intent: string;
  actionType: 'task_created' | 'note_created' | 'event_created' | 'reminder_created' | 'missing_information' | 'choices_suggested' | 'none';
  entity?: unknown;
  reminder?: unknown;
  question?: string;
  message?: string;
  choices?: AIChoice[];
}

export async function orchestrateAIAction(
  userId: string,
  interpretation: AIInterpretationResult,
  googleAccessToken?: string
): Promise<ActionResult> {
  if (!userId) {
    throw new Error('User authentication context is required for action execution');
  }

  switch (interpretation.intent) {
    case 'create_task': {
      if (!interpretation.title) {
        return {
          success: false,
          intent: interpretation.intent,
          actionType: 'missing_information',
          question: 'What is the title of the task?',
        };
      }

      const task = await createTask(userId, {
        title: interpretation.title,
        description: interpretation.description || null,
        due_at: interpretation.dueAt || null,
        completed: false,
      });

      let reminderEntity = null;
      if (interpretation.remindAt || interpretation.reminderMinutesBefore) {
        let remindAtStr = interpretation.remindAt;

        if (!remindAtStr && interpretation.dueAt && interpretation.reminderMinutesBefore) {
          const dueDate = new Date(interpretation.dueAt);
          const remindDate = new Date(dueDate.getTime() - interpretation.reminderMinutesBefore * 60 * 1000);
          remindAtStr = remindDate.toISOString();
        }

        if (remindAtStr) {
          reminderEntity = await createReminder(userId, {
            task_id: task.id,
            remind_at: remindAtStr,
            status: 'pending',
          });
        }
      }

      return {
        success: true,
        intent: interpretation.intent,
        actionType: 'task_created',
        entity: task,
        reminder: reminderEntity,
        message: `Task "${task.title}" created successfully.`,
      };
    }

    case 'create_note': {
      let content = interpretation.content?.trim() || interpretation.description?.trim() || '';
      if (!content || /\(Optional\)/i.test(content) || /Please provide/i.test(content)) {
        content = interpretation.title && !/\(Optional\)/i.test(interpretation.title) && !interpretation.title.endsWith('?')
          ? interpretation.title
          : 'Saved Information';
      }

      let title = interpretation.title?.trim() || '';
      if (!title || /\(Optional\)/i.test(title) || title.endsWith('?')) {
        title = content.length > 35 ? content.slice(0, 32) + '...' : content;
      }

      const note = await createNote(userId, {
        title: title.trim(),
        content: content.trim(),
      });

      return {
        success: true,
        intent: interpretation.intent,
        actionType: 'note_created',
        entity: note,
        message: `Note "${note.title}" created successfully.`,
      };
    }

    case 'create_event': {
      if (!interpretation.title) {
        return {
          success: false,
          intent: interpretation.intent,
          actionType: 'missing_information',
          question: 'What is the title of the event or appointment?',
        };
      }

      if (!interpretation.startAt || !interpretation.endAt) {
        return {
          success: false,
          intent: interpretation.intent,
          actionType: 'missing_information',
          question: interpretation.question || 'What date and time does the event start and end?',
        };
      }

      const event = await createEvent(
        userId,
        {
          title: interpretation.title,
          description: interpretation.description || null,
          start_at: interpretation.startAt,
          end_at: interpretation.endAt,
        },
        googleAccessToken
      );

      let reminderEntity = null;
      let remindAtStr = interpretation.remindAt;

      if (!remindAtStr && interpretation.startAt) {
        if (interpretation.reminderMinutesBefore) {
          const startDate = new Date(interpretation.startAt);
          const remindDate = new Date(startDate.getTime() - interpretation.reminderMinutesBefore * 60 * 1000);
          remindAtStr = remindDate.toISOString();
        } else {
          // Default: trigger reminder alert at the appointment start time!
          remindAtStr = interpretation.startAt;
        }
      }

      if (remindAtStr) {
        reminderEntity = await createReminder(userId, {
          event_id: event.id,
          remind_at: remindAtStr,
          status: 'pending',
        });
      }

      const googleMsg = event.calendar_event_id ? ' (synced to Google Calendar)' : '';
      return {
        success: true,
        intent: interpretation.intent,
        actionType: 'event_created',
        entity: event,
        reminder: reminderEntity,
        message: `Event "${event.title}" created successfully${googleMsg}.`,
      };
    }

    case 'create_reminder': {
      if (!interpretation.remindAt) {
        return {
          success: false,
          intent: interpretation.intent,
          actionType: 'missing_information',
          question: 'When should I remind you?',
        };
      }

      let reminderTitle = interpretation.title?.trim() || '';
      if (!reminderTitle || ['reminder', 'reminder alert', 'task', 'scheduled item'].includes(reminderTitle.toLowerCase())) {
        reminderTitle = interpretation.description?.trim() || 'Scheduled Reminder';
      }

      const task = await createTask(userId, {
        title: reminderTitle,
        description: interpretation.description || null,
        due_at: interpretation.remindAt,
        completed: false,
      });

      const reminder = await createReminder(userId, {
        task_id: task.id,
        remind_at: interpretation.remindAt,
        status: 'pending',
      });

      if (googleAccessToken) {
        const endAtDate = new Date(new Date(interpretation.remindAt).getTime() + 15 * 60 * 1000).toISOString();
        await createGoogleCalendarEvent(googleAccessToken, {
          title: `🔔 Reminder: ${reminderTitle}`,
          description: interpretation.description || `LifeOS Reminder scheduled for ${new Date(interpretation.remindAt).toLocaleTimeString()}`,
          startAt: interpretation.remindAt,
          endAt: endAtDate,
        });
      }

      return {
        success: true,
        intent: interpretation.intent,
        actionType: 'reminder_created',
        entity: task,
        reminder,
        message: `Reminder set for ${new Date(interpretation.remindAt).toLocaleString()}.`,
      };
    }

    case 'suggest_choices': {
      return {
        success: true,
        intent: interpretation.intent,
        actionType: 'choices_suggested',
        question: interpretation.question || 'What would you like me to do with this item?',
        choices: interpretation.choices || [],
      };
    }

    case 'missing_information': {
      return {
        success: false,
        intent: interpretation.intent,
        actionType: 'missing_information',
        question: interpretation.question || 'Could you provide more details?',
      };
    }

    default: {
      return {
        success: true,
        intent: 'suggest_choices',
        actionType: 'choices_suggested',
        question: interpretation.question || 'What would you like me to do with this item?',
        choices: interpretation.choices || [],
      };
    }
  }
}
