import { AIInterpretationResult } from '@/types/ai';
import { createTask } from '@/services/tasks';
import { createNote } from '@/services/notes';
import { createEvent } from '@/services/events';
import { createReminder } from '@/services/reminders';

export interface ActionResult {
  success: boolean;
  intent: string;
  actionType: 'task_created' | 'note_created' | 'event_created' | 'reminder_created' | 'missing_information' | 'none';
  entity?: unknown;
  reminder?: unknown;
  question?: string;
  message?: string;
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
      const title = interpretation.title || interpretation.content?.slice(0, 30) || 'Untitled Note';
      const content = interpretation.content || interpretation.description || interpretation.title || '';

      if (!content.trim()) {
        return {
          success: false,
          intent: interpretation.intent,
          actionType: 'missing_information',
          question: 'What content would you like to save in the note?',
        };
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
      if (interpretation.remindAt || interpretation.reminderMinutesBefore) {
        let remindAtStr = interpretation.remindAt;

        if (!remindAtStr && interpretation.startAt && interpretation.reminderMinutesBefore) {
          const startDate = new Date(interpretation.startAt);
          const remindDate = new Date(startDate.getTime() - interpretation.reminderMinutesBefore * 60 * 1000);
          remindAtStr = remindDate.toISOString();
        }

        if (remindAtStr) {
          reminderEntity = await createReminder(userId, {
            event_id: event.id,
            remind_at: remindAtStr,
            status: 'pending',
          });
        }
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

      const task = await createTask(userId, {
        title: interpretation.title || 'Reminder Alert',
        description: interpretation.description || null,
        due_at: interpretation.remindAt,
        completed: false,
      });

      const reminder = await createReminder(userId, {
        task_id: task.id,
        remind_at: interpretation.remindAt,
        status: 'pending',
      });

      return {
        success: true,
        intent: interpretation.intent,
        actionType: 'reminder_created',
        entity: task,
        reminder,
        message: `Reminder set for ${new Date(interpretation.remindAt).toLocaleString()}.`,
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
        success: false,
        intent: 'unknown',
        actionType: 'none',
        message: 'Could not recognize request intent. Try phrasing as a task, note, or event.',
      };
    }
  }
}
