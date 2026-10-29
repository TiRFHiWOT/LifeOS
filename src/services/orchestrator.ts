import { AIInterpretationResult, AIChoice } from '@/types/ai';
import { GoalPlan, ExecutedPlanSummary } from '@/types/plan';
import { createTask, updateTask, deleteTask, getTasks } from '@/services/tasks';
import { createNote } from '@/services/notes';
import { createEvent, updateEvent, deleteEvent, getEvents } from '@/services/events';
import { createReminder } from '@/services/reminders';
import { createGoogleCalendarEvent } from '@/services/googleCalendar';
import { generateGoalPlan, executeGoalPlan } from '@/services/planner';
import { getWeatherForecast, WeatherForecastResult } from '@/services/weather';
import { logAgentActivity } from '@/services/agentActivityLog';

export interface ActionResult {
  success: boolean;
  intent: string;
  actionType:
    | 'task_created'
    | 'note_created'
    | 'event_created'
    | 'reminder_created'
    | 'missing_information'
    | 'choices_suggested'
    | 'plan_created'
    | 'plan_executed'
    | 'weather_checked'
    | 'confirmation_required'
    | 'event_updated'
    | 'task_updated'
    | 'event_deleted'
    | 'task_deleted'
    | 'none';
  entity?: unknown;
  reminder?: unknown;
  question?: string;
  message?: string;
  choices?: AIChoice[];
  plan?: GoalPlan;
  executedPlan?: ExecutedPlanSummary;
  weatherForecast?: WeatherForecastResult;
  createdItem?: {
    id?: string;
    title?: string;
    startAt?: string;
    endAt?: string;
    dueAt?: string;
    content?: string;
    remindAt?: string;
  };
}

export async function orchestrateAIAction(
  userId: string,
  interpretation: AIInterpretationResult,
  googleAccessToken?: string,
  userLocation?: string
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

    case 'create_plan': {
      const goal = interpretation.goal || interpretation.title || 'Goal Plan';
      const fullPlan = await generateGoalPlan(goal, { referenceDateISO: interpretation.startAt || undefined, userLocation });
      const executedSummary = await executeGoalPlan(userId, fullPlan, googleAccessToken);

      const formattedSteps = executedSummary.executedSteps
        .map((s, i) => `${i + 1}. [${s.actionType.toUpperCase()}] ${s.stepTitle} → ${s.summary}`)
        .join('\n');

      logAgentActivity({
        type: 'plan_created',
        title: `Plan Executed: "${fullPlan.goal}"`,
        details: `Generated and scheduled ${fullPlan.steps.length} action steps`,
        status: 'completed',
      });

      return {
        success: true,
        intent: interpretation.intent,
        actionType: 'plan_created',
        plan: fullPlan,
        executedPlan: executedSummary,
        message: `Plan Created & Connected to Actions: ${fullPlan.goal}\n\nGenerated Actions:\n${formattedSteps}`,
      };
    }

    case 'update_event': {
      let updatedEntity = null;
      let targetId = interpretation.targetItemId;

      if (!targetId && userId) {
        try {
          const userEvents = await getEvents(userId);
          const searchTitle = (interpretation.title || 'dentist').toLowerCase();
          const match = userEvents.find(e => e.title.toLowerCase().includes(searchTitle) || searchTitle.includes(e.title.toLowerCase()));
          if (match) {
            targetId = match.id;
          }
        } catch (err) {
          console.error('Failed to lookup event by title:', err);
        }
      }

      const targetStart = interpretation.startAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const targetEnd = interpretation.endAt || new Date(new Date(targetStart).getTime() + 60 * 60 * 1000).toISOString();

      if (targetId) {
        try {
          updatedEntity = await updateEvent(userId, targetId, {
            start_at: targetStart,
            end_at: targetEnd,
          });
        } catch (err) {
          console.error('Failed to update event in database:', err);
        }
      }

      const formattedNewTime = interpretation.startAt
        ? new Date(interpretation.startAt).toLocaleString([], { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'new date';

      return {
        success: true,
        intent: interpretation.intent,
        actionType: 'event_updated',
        entity: updatedEntity,
        createdItem: updatedEntity
          ? {
              id: updatedEntity.id,
              title: updatedEntity.title,
              startAt: updatedEntity.start_at,
              endAt: updatedEntity.end_at,
            }
          : undefined,
        message: `Event "${interpretation.title || updatedEntity?.title || 'Appointment'}" moved to ${formattedNewTime} successfully.`,
      };
    }

    case 'update_task': {
      let updatedEntity = null;
      let targetId = interpretation.targetItemId;

      if (!targetId && userId) {
        try {
          const userTasks = await getTasks(userId);
          const searchTitle = (interpretation.title || '').toLowerCase();
          const match = userTasks.find(t => t.title.toLowerCase().includes(searchTitle) || searchTitle.includes(t.title.toLowerCase()));
          if (match) {
            targetId = match.id;
          }
        } catch (err) {
          console.error('Failed to lookup task by title:', err);
        }
      }

      if (targetId) {
        try {
          updatedEntity = await updateTask(userId, targetId, {
            due_at: interpretation.dueAt || undefined,
            title: interpretation.title || undefined,
          });
        } catch (err) {
          console.error('Failed to update task in database:', err);
        }
      }

      return {
        success: true,
        intent: interpretation.intent,
        actionType: 'task_updated',
        entity: updatedEntity,
        message: `Task "${interpretation.title || updatedEntity?.title || 'Task'}" updated successfully.`,
      };
    }

    case 'weather_check': {
      const forecast = interpretation.weatherForecast || (await getWeatherForecast());

      logAgentActivity({
        type: 'weather_checked',
        title: `Weather Forecast Retrived`,
        details: `${forecast.location}: ${forecast.weatherCondition} (${forecast.precipitationProbability}% rain chance)`,
        status: 'info',
      });

      return {
        success: true,
        intent: interpretation.intent,
        actionType: 'weather_checked',
        weatherForecast: forecast,
        message: forecast.recommendation,
      };
    }

    case 'action_confirmation_required': {
      logAgentActivity({
        type: 'confirmation_requested',
        title: `Action Confirmation Required`,
        details: interpretation.question || `Confirmation requested for ${interpretation.title}`,
        status: 'warning',
      });

      return {
        success: true,
        intent: interpretation.intent,
        actionType: 'confirmation_required',
        question: interpretation.question || `Are you sure you want to proceed with "${interpretation.title || 'this action'}"?`,
        message: interpretation.confirmationMessage || 'This action requires your confirmation.',
      };
    }

    case 'delete_event': {
      let targetId = interpretation.targetItemId;
      if (!targetId && userId) {
        try {
          const userEvents = await getEvents(userId);
          const searchTitle = (interpretation.title || '').toLowerCase();
          const match = userEvents.find(e => e.title.toLowerCase().includes(searchTitle) || searchTitle.includes(e.title.toLowerCase()));
          if (match) {
            targetId = match.id;
          }
        } catch (err) {
          console.error('Failed to lookup event by title:', err);
        }
      }

      if (targetId) {
        try {
          await deleteEvent(userId, targetId);
        } catch (err) {
          console.error('Failed to delete event in database:', err);
        }
      }
      return {
        success: true,
        intent: interpretation.intent,
        actionType: 'event_deleted',
        message: `Event "${interpretation.title || 'Appointment'}" deleted successfully.`,
      };
    }

    case 'delete_task': {
      let targetId = interpretation.targetItemId;
      if (!targetId && userId) {
        try {
          const userTasks = await getTasks(userId);
          const searchTitle = (interpretation.title || '').toLowerCase();
          const match = userTasks.find(t => t.title.toLowerCase().includes(searchTitle) || searchTitle.includes(t.title.toLowerCase()));
          if (match) {
            targetId = match.id;
          }
        } catch (err) {
          console.error('Failed to lookup task by title:', err);
        }
      }

      if (targetId) {
        try {
          await deleteTask(userId, targetId);
        } catch (err) {
          console.error('Failed to delete task in database:', err);
        }
      }

      return {
        success: true,
        intent: interpretation.intent,
        actionType: 'task_deleted',
        message: `Item "${interpretation.title || 'Item'}" deleted successfully.`,
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
