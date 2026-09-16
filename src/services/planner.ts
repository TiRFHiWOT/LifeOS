import { GoogleGenAI, Type } from '@google/genai';
import {
  GoalPlan,
  PlanStep,
  PlanStepPriority,
  PlanStepStatus,
  PlanStepActionType,
  ExecutedPlanSummary,
  ExecutedStep,
} from '../types/plan';
import { createTask } from '@/services/tasks';
import { createEvent } from '@/services/events';
import { createReminder } from '@/services/reminders';
import { createNote } from '@/services/notes';

export async function generateGoalPlan(
  goalPrompt: string,
  referenceDateISO?: string
): Promise<GoalPlan> {
  const apiKey = process.env.GEMINI_API_KEY;
  const now = referenceDateISO ? new Date(referenceDateISO) : new Date();
  const currentDateStr = now.toISOString();

  if (!apiKey || apiKey === 'your-gemini-api-key') {
    return generateFallbackGoalPlan(goalPrompt, now);
  }

  const userLocation = 'Addis Ababa, Ethiopia';

  const systemInstruction = `
You are the AI Planning Engine for LifeOS. Your task is to take a user's goal statement and convert it into a structured, step-by-step action plan.

Current reference context:
- ISO UTC Timestamp: ${currentDateStr}
- User Home Location: ${userLocation}

Geographical & Travel Intelligence Rules:
1. Use real-world geography relative to the user's location (${userLocation}).
2. If the user mentions traveling within their current city (${userLocation}), generate a local city activity plan (no passport or travel tickets required).
3. If the user mentions traveling to another domestic city in the same country (e.g., Hawassa, Bahir Dar, Dire Dawa), generate a domestic travel plan (local ID & transport, NO passport required).
4. If the user mentions traveling to another country (e.g., Nairobi, Paris, London, Dubai), generate an international travel plan (passport & visa check required).
5. For all other goals, generate 3 to 6 logical, ordered action steps tailored to the user's request.

Rules for Steps:
- title: concise actionable title (e.g. "Contact landlord")
- description: 1-2 sentence explanation of what needs to be done.
- dueDate: ISO 8601 date string relative to the reference time context, or null if flexible.
- priority: 'high', 'medium', or 'low'.
- dependency: title of an earlier step that must be completed first, or null if independent.
- status: 'pending'.
`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.0-flash';

    const response = await ai.models.generateContent({
      model,
      contents: `Goal statement: ${goalPrompt}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            goal: { type: Type.STRING },
            description: { type: Type.STRING },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  dueDate: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                  dependency: { type: Type.STRING },
                  status: { type: Type.STRING, enum: ['pending', 'in_progress', 'completed'] },
                },
                required: ['title', 'description', 'priority', 'status'],
              },
            },
          },
          required: ['goal', 'steps'],
        },
      },
    });

    if (!response.text) {
      throw new Error('Empty response from Gemini Planning Engine');
    }

    const parsed: GoalPlan = JSON.parse(response.text);
    return sanitizeGoalPlan(parsed, goalPrompt, now);
  } catch (err: unknown) {
    console.error('Gemini Planning Engine API call failed, falling back to heuristic planner:', err);
    return generateFallbackGoalPlan(goalPrompt, now);
  }
}

function sanitizeGoalPlan(plan: GoalPlan, rawPrompt: string, now: Date): GoalPlan {
  const goal = plan.goal?.trim() || rawPrompt;
  const description = plan.description?.trim() || `Step-by-step plan for: ${goal}`;

  const sanitizedSteps: PlanStep[] = (plan.steps || []).map((step, index) => {
    const priority: PlanStepPriority = ['high', 'medium', 'low'].includes(step.priority)
      ? step.priority
      : index === 0
      ? 'high'
      : 'medium';

    const status: PlanStepStatus = ['pending', 'in_progress', 'completed'].includes(step.status)
      ? step.status
      : 'pending';

    return {
      title: step.title?.trim() || `Step ${index + 1}`,
      description: step.description?.trim() || `Execute action for ${step.title || 'step'}`,
      dueDate: step.dueDate || null,
      priority,
      dependency: step.dependency || (index > 0 ? plan.steps[index - 1]?.title || null : null),
      status,
    };
  });

  if (sanitizedSteps.length === 0) {
    return generateFallbackGoalPlan(rawPrompt, now);
  }

  const rawPlan: GoalPlan = {
    goal,
    description,
    steps: sanitizedSteps,
    createdAt: new Date().toISOString(),
    status: 'ready',
  };

  return evaluatePlanDependencies(rawPlan);
}

export function generateFallbackGoalPlan(prompt: string, now: Date): GoalPlan {
  const lower = prompt.toLowerCase();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Dynamically extract destination from user prompt (e.g. "Hawassa", "Nairobi", "Paris")
  const destMatch = prompt.match(/(?:trip|travel|visit|go|going|fly|flying)\s+(?:to|for|in)?\s*([A-Za-z\s]+?)(?:\s+next|\s+this|\s+in|\.|$)/i);
  let destination = '';
  if (destMatch && destMatch[1]) {
    const rawDest = destMatch[1].trim().replace(/^(my|a|the)\s+/i, '');
    if (rawDest.length > 1 && !['trip', 'travel', 'month', 'week', 'year', 'vacation'].includes(rawDest.toLowerCase())) {
      destination = rawDest.charAt(0).toUpperCase() + rawDest.slice(1);
    }
  }

  if (lower.includes('trip') || lower.includes('travel') || lower.includes('vacation') || lower.includes('flight') || destination) {
    const isExplicitInternational = /(nairobi|kenya|london|paris|france|new york|usa|america|dubai|uae|tokyo|japan|rome|italy|uganda|tanzania|egypt|cairo|international|overseas|foreign|visa|passport)/i.test(prompt) || (destination && /(nairobi|kenya|london|paris|france|new york|usa|america|dubai|uae|tokyo|japan|rome|italy|uganda|tanzania|egypt|cairo|international|overseas|foreign)/i.test(destination));
    const isDomestic = !isExplicitInternational;

    const goalTitle = destination ? `Prepare for ${destination} trip` : 'Prepare for travel trip';
    const goalDesc = destination
      ? `Comprehensive travel preparation roadmap for ${destination} trip.`
      : 'Comprehensive travel preparation roadmap for your upcoming trip.';
    const stayDesc = destination
      ? `Reserve hotel or stay in ${destination} for the duration of the visit.`
      : 'Reserve hotel or stay for the duration of the visit.';

    const step1Title = isDomestic ? 'Arrange transportation & ID' : 'Check passport';
    const step1Desc = isDomestic
      ? `Verify valid government ID card and book travel/bus/flight tickets for ${destination || 'your trip'}.`
      : 'Verify passport validity has at least 6 months remaining before travel date.';

    return {
      goal: goalTitle,
      description: goalDesc,
      createdAt: new Date().toISOString(),
      status: 'draft',
      steps: [
        {
          title: step1Title,
          description: step1Desc,
          dueDate: nextWeek,
          priority: 'high',
          dependency: null,
          status: 'pending',
        },
        {
          title: 'Book accommodation',
          description: stayDesc,
          dueDate: nextWeek,
          priority: 'high',
          dependency: step1Title,
          status: 'pending',
        },
        {
          title: 'Prepare packing list',
          description: 'Assemble clothing, electronics, travel adapters, and personal essentials.',
          dueDate: nextMonth,
          priority: 'medium',
          dependency: 'Book accommodation',
          status: 'pending',
        },
        {
          title: 'Set travel reminder',
          description: 'Schedule alert reminders for ticket check-in and document verification.',
          dueDate: nextMonth,
          priority: 'low',
          dependency: 'Prepare packing list',
          status: 'pending',
        },
      ],
    };
  }

  if (lower.includes('apartment') || lower.includes('mov')) {
    return {
      goal: 'Move to new apartment',
      description: 'Structured relocation action plan for moving to a new home.',
      createdAt: new Date().toISOString(),
      status: 'draft',
      steps: [
        {
          title: 'Contact landlord',
          description: 'Confirm notice period and finalize lease terms with landlord.',
          dueDate: nextWeek,
          priority: 'high',
          dependency: null,
          status: 'pending',
        },
        {
          title: 'Arrange transportation',
          description: 'Book moving company or rental truck for moving day.',
          dueDate: nextWeek,
          priority: 'high',
          dependency: 'Contact landlord',
          status: 'pending',
        },
        {
          title: 'Pack belongings',
          description: 'Box household items, label fragile goods, and organize room items.',
          dueDate: nextMonth,
          priority: 'medium',
          dependency: 'Arrange transportation',
          status: 'pending',
        },
        {
          title: 'Transfer internet',
          description: 'Notify ISP to relocate broadband connection to new address.',
          dueDate: nextMonth,
          priority: 'medium',
          dependency: 'Pack belongings',
          status: 'pending',
        },
        {
          title: 'Change address',
          description: 'Update official billing address with banks, postal service, and subscriptions.',
          dueDate: nextMonth,
          priority: 'low',
          dependency: 'Transfer internet',
          status: 'pending',
        },
      ],
    };
  }

  const match = prompt.match(/(?:prepare for|plan|organize)\s+(?:my\s+)?(.+)/i);
  const goalTitle = match ? match[1].charAt(0).toUpperCase() + match[1].slice(1) : prompt;

  return {
    goal: goalTitle,
    description: `Action plan generated for: ${goalTitle}`,
    createdAt: new Date().toISOString(),
    status: 'draft',
    steps: [
      {
        title: `Research requirements for ${goalTitle}`,
        description: 'Gather essential documents, costs, and prerequisite information.',
        dueDate: nextWeek,
        priority: 'high',
        dependency: null,
        status: 'pending',
      },
      {
        title: `Create task list for ${goalTitle}`,
        description: 'Detail key sub-tasks and assign target dates for completion.',
        dueDate: nextWeek,
        priority: 'medium',
        dependency: `Research requirements for ${goalTitle}`,
        status: 'pending',
      },
      {
        title: `Schedule deadlines on calendar`,
        description: 'Block out dedicated time slots on calendar for key milestones.',
        dueDate: nextMonth,
        priority: 'medium',
        dependency: `Create task list for ${goalTitle}`,
        status: 'pending',
      },
      {
        title: 'Set key reminders',
        description: 'Configure automated notifications for approaching deadlines.',
        dueDate: nextMonth,
        priority: 'low',
        dependency: `Schedule deadlines on calendar`,
        status: 'pending',
      },
    ],
  };
}

export function classifyStepActionType(title: string, description: string): PlanStepActionType {
  const text = `${title} ${description}`.toLowerCase();

  // Event keywords: book, reserve, flight, stay, hotel, accommodation, appointment, meeting, visit, interview
  if (/(book|reserve|flight|stay|hotel|accommodation|appointment|meeting|visit|interview)/i.test(text)) {
    return 'event';
  }

  // Reminder keywords: set reminder, alert, notify, ping, heads up, reminder
  if (/(set reminder|alert|notify|ping|reminder for|travel reminder)/i.test(text)) {
    return 'reminder';
  }

  // Note keywords: packing list, documents, passwords, wifi, details to save, info, reference note, notes
  if (/(packing list|documents|passwords|wifi|details|info to save|reference note|notes)/i.test(text)) {
    return 'note';
  }

  // Default: task
  return 'task';
}

export async function executeGoalPlan(
  userId: string,
  plan: GoalPlan,
  googleAccessToken?: string
): Promise<ExecutedPlanSummary> {
  const executedSteps: ExecutedStep[] = [];
  const counts = { tasks: 0, events: 0, reminders: 0, notes: 0 };
  const now = new Date();

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    const actionType = step.actionType || classifyStepActionType(step.title, step.description);

    switch (actionType) {
      case 'event': {
        const startAtDate = step.dueDate ? new Date(step.dueDate) : new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
        const endAtDate = new Date(startAtDate.getTime() + 60 * 60 * 1000);

        const event = await createEvent(
          userId,
          {
            title: step.title,
            description: step.description,
            start_at: startAtDate.toISOString(),
            end_at: endAtDate.toISOString(),
          },
          googleAccessToken
        );

        let reminderEntity = null;
        if (step.priority === 'high' || step.priority === 'medium') {
          reminderEntity = await createReminder(userId, {
            event_id: event.id,
            remind_at: startAtDate.toISOString(),
            status: 'pending',
          });
        }

        counts.events++;
        executedSteps.push({
          stepTitle: step.title,
          actionType: 'event',
          entityId: event.id,
          reminderId: reminderEntity?.id,
          summary: `Calendar Event "${event.title}" scheduled for ${startAtDate.toLocaleDateString()}`,
        });
        break;
      }

      case 'reminder': {
        const remindAtDate = step.dueDate ? new Date(step.dueDate) : new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
        const task = await createTask(userId, {
          title: step.title,
          description: step.description,
          due_at: remindAtDate.toISOString(),
          completed: false,
        });

        const reminder = await createReminder(userId, {
          task_id: task.id,
          remind_at: remindAtDate.toISOString(),
          status: 'pending',
        });

        counts.reminders++;
        executedSteps.push({
          stepTitle: step.title,
          actionType: 'reminder',
          entityId: task.id,
          reminderId: reminder.id,
          summary: `Reminder set for ${remindAtDate.toLocaleString()}`,
        });
        break;
      }

      case 'note': {
        const note = await createNote(userId, {
          title: step.title,
          content: `${step.title}\n\n${step.description}`,
        });

        counts.notes++;
        executedSteps.push({
          stepTitle: step.title,
          actionType: 'note',
          entityId: note.id,
          summary: `Note "${note.title}" saved`,
        });
        break;
      }

      case 'task':
      default: {
        const dueAtDate = step.dueDate ? new Date(step.dueDate) : new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
        const task = await createTask(userId, {
          title: step.title,
          description: step.description,
          due_at: dueAtDate.toISOString(),
          completed: false,
        });

        let reminderEntity = null;
        if (step.priority === 'high') {
          reminderEntity = await createReminder(userId, {
            task_id: task.id,
            remind_at: dueAtDate.toISOString(),
            status: 'pending',
          });
        }

        counts.tasks++;
        executedSteps.push({
          stepTitle: step.title,
          actionType: 'task',
          entityId: task.id,
          reminderId: reminderEntity?.id,
          summary: `Task "${task.title}" created (Due: ${dueAtDate.toLocaleDateString()})`,
        });
        break;
      }
    }
  }

  return {
    goal: plan.goal,
    totalSteps: plan.steps.length,
    executedSteps,
    counts,
  };
}

export function evaluatePlanDependencies(plan: GoalPlan): GoalPlan {
  const steps = (plan.steps || []).map((s) => ({ ...s }));

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.status === 'completed') continue;

    if (step.dependency) {
      const depTarget = step.dependency.toLowerCase().trim();
      const prereq = steps.find(
        (s, idx) =>
          idx !== i &&
          (s.title.toLowerCase().trim() === depTarget ||
            s.title.toLowerCase().includes(depTarget) ||
            depTarget.includes(s.title.toLowerCase()))
      );

      if (prereq && prereq.status !== 'completed') {
        step.status = 'blocked';
      } else {
        step.status = step.status === 'in_progress' ? 'in_progress' : 'ready';
      }
    } else {
      step.status = step.status === 'in_progress' ? 'in_progress' : 'ready';
    }
  }

  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const progressPercentage = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  let overallStatus: 'draft' | 'ready' | 'in_progress' | 'blocked' | 'completed' = 'ready';
  if (completedCount === steps.length && steps.length > 0) {
    overallStatus = 'completed';
  } else if (completedCount > 0 || steps.some((s) => s.status === 'in_progress')) {
    overallStatus = 'in_progress';
  } else if (steps.every((s) => s.status === 'blocked')) {
    overallStatus = 'blocked';
  }

  return {
    ...plan,
    steps,
    status: overallStatus,
    progressPercentage,
  };
}

export function completePlanStep(plan: GoalPlan, stepTitleOrIndex: string | number): GoalPlan {
  const updatedSteps = (plan.steps || []).map((s) => ({ ...s }));

  if (typeof stepTitleOrIndex === 'number') {
    if (updatedSteps[stepTitleOrIndex]) {
      updatedSteps[stepTitleOrIndex].status = 'completed';
    }
  } else {
    const targetLower = stepTitleOrIndex.toLowerCase().trim();
    const targetStep = updatedSteps.find(
      (s) => s.title.toLowerCase().trim() === targetLower || s.title.toLowerCase().includes(targetLower)
    );
    if (targetStep) {
      targetStep.status = 'completed';
    }
  }

  return evaluatePlanDependencies({
    ...plan,
    steps: updatedSteps,
  });
}
