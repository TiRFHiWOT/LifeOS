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

export interface PlanGenerationOptions {
  referenceDateISO?: string;
  userLocation?: string;
  userTimeZone?: string;
}

export async function generateGoalPlan(
  goalPrompt: string,
  options?: PlanGenerationOptions | string
): Promise<GoalPlan> {
  const apiKey = process.env.GEMINI_API_KEY;

  let referenceDateISO: string | undefined;
  let userLocation = 'Addis Ababa, Ethiopia';

  if (typeof options === 'string') {
    referenceDateISO = options;
  } else if (options) {
    referenceDateISO = options.referenceDateISO;
    if (options.userLocation) {
      userLocation = options.userLocation;
    }
  }

  const now = referenceDateISO ? new Date(referenceDateISO) : new Date();
  const currentDateStr = now.toISOString();

  if (!apiKey || apiKey === 'your-gemini-api-key') {
    return generateFallbackGoalPlan(goalPrompt, now, userLocation);
  }

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
- id: unique string step identifier e.g. "step-1"
- title: concise actionable title (e.g. "Contact landlord")
- description: 1-2 sentence explanation of what needs to be done.
- dueDate: ISO 8601 date string relative to the reference time context, or null if flexible.
- priority: 'high', 'medium', or 'low'.
- actionType: 'task', 'event', 'reminder', or 'note'.
- dependency: step id or title of an earlier step that must be completed first, or null if independent.
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
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  dueDate: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                  actionType: { type: Type.STRING, enum: ['task', 'event', 'reminder', 'note'] },
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
    return sanitizeGoalPlan(parsed, goalPrompt, now, userLocation);
  } catch (err: unknown) {
    console.error('Gemini Planning Engine API call failed, falling back to heuristic planner:', err);
    return generateFallbackGoalPlan(goalPrompt, now, userLocation);
  }
}

function sanitizeGoalPlan(plan: GoalPlan, rawPrompt: string, now: Date, userLocation: string): GoalPlan {
  const goal = plan.goal?.trim() || rawPrompt;
  const description = plan.description?.trim() || `Step-by-step plan for: ${goal}`;

  const sanitizedSteps: PlanStep[] = (plan.steps || []).map((step, index) => {
    const id = step.id?.trim() || `step-${index + 1}`;
    const priority: PlanStepPriority = ['high', 'medium', 'low'].includes(step.priority)
      ? step.priority
      : index === 0
      ? 'high'
      : 'medium';

    const status: PlanStepStatus = ['pending', 'in_progress', 'completed', 'blocked', 'failed'].includes(step.status)
      ? step.status
      : 'pending';

    const actionType = step.actionType || classifyStepActionType(step.title || '', step.description || '');

    return {
      id,
      title: step.title?.trim() || `Step ${index + 1}`,
      description: step.description?.trim() || `Execute action for ${step.title || 'step'}`,
      dueDate: step.dueDate || null,
      priority,
      actionType,
      dependency: step.dependency || null,
      status,
    };
  });

  if (sanitizedSteps.length === 0) {
    return generateFallbackGoalPlan(rawPrompt, now, userLocation);
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

export function generateFallbackGoalPlan(prompt: string, now: Date, userLocation?: string): GoalPlan {
  const lower = prompt.toLowerCase();

  const deadlineMatch = lower.match(
    /\b(?:by|before|until|no later than)\s+([a-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?|\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/i
  );
  const deadlineStr = deadlineMatch ? deadlineMatch[1] : null;

  const getDeadlineDate = (): Date => {
    if (!deadlineStr) return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const parsed = new Date(`${deadlineStr} ${now.getFullYear()}`);
    if (!isNaN(parsed.getTime())) {
      if (parsed < now) parsed.setFullYear(now.getFullYear() + 1);
      return parsed;
    }
    return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  };

  const deadlineDate = getDeadlineDate();
  const deadlineISO = deadlineDate.toISOString();

  const midpointDate = new Date((now.getTime() + deadlineDate.getTime()) / 2);
  const midpointISO = midpointDate.toISOString();

  const earlyDate = new Date(now.getTime() + Math.max(3, Math.floor((deadlineDate.getTime() - now.getTime()) / 4 / 86400000)) * 86400000);
  const earlyISO = earlyDate.toISOString();

  const firstSentence = prompt.split(/[.!?]\s+/)[0].trim();

  const extractedGoalNoun = firstSentence
    .replace(/^i\s+(need\s+to|want\s+to|should|would\s+like\s+to)\s+/i, '')
    .replace(/^(prepare\s+for|plan\s+for|plan\s+my|organize\s+my|help\s+me\s+prepare\s+for|get\s+ready\s+for)\s+/i, '')
    .replace(/\s+(next|this|on)\s+(friday|monday|tuesday|wednesday|thursday|saturday|sunday|week|month)\b.*/i, '')
    .replace(/\s+(by|before|until)\s+\w.*/i, '')
    .trim();

  const VAGUE_SINGLE_WORDS = new Set(['travel', 'prepare', 'plan', 'organize', 'do', 'make', 'get', 'go', 'work', 'start', 'finish', 'complete']);
  let cleanGoal = extractedGoalNoun && extractedGoalNoun.length >= 3 && !VAGUE_SINGLE_WORDS.has(extractedGoalNoun.toLowerCase())
    ? extractedGoalNoun
    : firstSentence
        .replace(/^i\s+(need\s+to|want\s+to|should|would\s+like\s+to)\s+/i, '')
        .replace(/\s+(by|before|until)\s+\w.*/i, '')
        .trim();
  if (!cleanGoal || cleanGoal.length < 3) cleanGoal = firstSentence;
  cleanGoal = cleanGoal.charAt(0).toUpperCase() + cleanGoal.slice(1);

  const enumerationPattern = /(?:(?:.*?[.!?]\s+)?(?:i\s+(?:need\s+to|want\s+to|should)\s+)(.+)|(?:first[,.]?\s+(?:i\s+(?:need\s+to|want\s+to|will|should)\s+)?)(.+?)(?:\s*[,.]?\s*(?:then|next|after\s+that)\b.+))/i;
  const enumerationMatch = prompt.match(enumerationPattern);
  const rawEnumeration = enumerationMatch ? (enumerationMatch[1] || enumerationMatch[2] ? prompt.replace(/^.*?(?:first[,.]?\s+(?:i\s+(?:need\s+to|want\s+to|will|should)\s+)?|i\s+(?:need\s+to|want\s+to|should)\s+)/i, '') : null) : null;

  const extractEnumeratedTasks = (text: string): string[] => {
    const cleaned = text
      .replace(/\b(and\s+(?:also\s+)?|then\s+(?:i\s+(?:need\s+to|want\s+to|will|should)\s+)?|after\s+that[,]?\s+(?:i\s+(?:need\s+to|want\s+to|will|should)\s+)?|finally[,]?\s+(?:i\s+(?:need\s+to|want\s+to|will|should)\s+)?|next[,]?\s+(?:i\s+(?:need\s+to|want\s+to|will|should)\s+)?)/gi, ',')
      .replace(/^(?:first[,.]?\s+(?:i\s+(?:need\s+to|want\s+to|will|should)\s+)?)/i, '')
      .replace(/;\s*/g, ',');
    const parts = cleaned.split(/,\s*/);
    return parts
      .map((p) => p.trim().replace(/^(also\s+|please\s+|then\s+|first\s+|next\s+|finally\s+)/i, '').trim())
      .filter((p) => p.length > 3 && p.length < 80);
  };

  const explicitTasks = rawEnumeration ? extractEnumeratedTasks(rawEnumeration) : [];

  const userCity = (userLocation || 'Addis Ababa').split(',')[0].trim().toLowerCase();

  const travelMatch = lower.match(
    /\b(?:trip\s+to|travel\s+to|traveling\s+to|travelling\s+to|fly(?:ing)?\s+to|going\s+to|visit(?:ing)?\s+|heading\s+to|journey\s+to|prepare.+trip\s+to|plan.+trip\s+to)\s+([a-z][a-z\s]{1,30}?)(?:\s+(?:by|before|in|next|on|for|from|\.|$))/i
  );
  const extractedDestination = travelMatch ? travelMatch[1].trim().replace(/\s+(in|by|next|for|from)$/i, '').trim() : null;

  const ETHIOPIAN_DOMESTIC = /\b(hawassa|bahir dar|dire dawa|gonder|gondar|mekele|jimma|adama|nazret|awash|lalibela|axum|harar|shashamane|arba minch|soddo|hosanna|wolaita|dessie|kombolcha)\b/i;
  const isLocalCityTravel = userCity && userCity.length >= 3 && lower.includes(userCity);
  const isDomesticTravel = !isLocalCityTravel && ETHIOPIAN_DOMESTIC.test(lower);

  const isTravelGoal = !!(extractedDestination) || /\b(trip|travel|flight|fly|passport|visa|itinerary|packing list|abroad|overseas|international|domestic)\b/i.test(lower);

  let steps: PlanStep[] = [];

  if (isLocalCityTravel) {
    const cityName = userCity.charAt(0).toUpperCase() + userCity.slice(1);
    steps = [
      {
        id: 'step-1',
        title: `Plan Local Itinerary in ${cityName}`,
        description: `Organize schedule and local activities in ${cityName}.`,
        dueDate: earlyISO,
        priority: 'high',
        actionType: 'task',
        dependency: null,
        status: 'pending',
      },
      {
        id: 'step-2',
        title: 'Arrange Local Transport & Bookings',
        description: `Check local transit options and reserve venues or activities in ${cityName}.`,
        dueDate: midpointISO,
        priority: 'medium',
        actionType: 'event',
        dependency: 'step-1',
        status: 'pending',
      },
      {
        id: 'step-3',
        title: 'Set Reminder for Local Event',
        description: `Set reminder for scheduled local activity in ${cityName}.`,
        dueDate: deadlineISO,
        priority: 'low',
        actionType: 'reminder',
        dependency: 'step-2',
        status: 'pending',
      },
    ];
  } else if (isDomesticTravel) {
    steps = [
      {
        id: 'step-1',
        title: 'Organize Domestic Transport & ID',
        description: `Verify local government ID and arrange transport tickets.`,
        dueDate: earlyISO,
        priority: 'high',
        actionType: 'task',
        dependency: null,
        status: 'pending',
      },
      {
        id: 'step-2',
        title: 'Book Local Lodging',
        description: `Reserve hotel or guest house at destination city.`,
        dueDate: midpointISO,
        priority: 'medium',
        actionType: 'event',
        dependency: 'step-1',
        status: 'pending',
      },
      {
        id: 'step-3',
        title: 'Prepare Packing List',
        description: 'Prepare a packing list and essential items for your trip.',
        dueDate: midpointISO,
        priority: 'low',
        actionType: 'note',
        dependency: null,
        status: 'pending',
      },
      {
        id: 'step-4',
        title: 'Set Travel Reminder',
        description: 'Set a reminder the day before your trip departure.',
        dueDate: deadlineISO,
        priority: 'medium',
        actionType: 'reminder',
        dependency: 'step-2',
        status: 'pending',
      },
    ];
  } else if (explicitTasks.length >= 2) {
    const datesPool = [earlyISO, earlyISO, midpointISO, midpointISO, deadlineISO, deadlineISO];
    steps = explicitTasks.map((taskTitle, i) => {
      const cap = taskTitle.charAt(0).toUpperCase() + taskTitle.slice(1);
      const prevId = i > 0 ? `step-${i}` : null;
      return {
        id: `step-${i + 1}`,
        title: cap,
        description: `Complete: ${cap.toLowerCase()}.`,
        dueDate: datesPool[Math.min(i, datesPool.length - 1)],
        priority: (i === 0 ? 'high' : i < 2 ? 'high' : 'medium') as PlanStepPriority,
        actionType: classifyStepActionType(cap, '') as PlanStepActionType,
        dependency: prevId,
        status: 'pending' as PlanStepStatus,
      };
    });
    steps.push({
      id: `step-${steps.length + 1}`,
      title: `Reminder: ${cleanGoal}`,
      description: `Set a reminder for the upcoming ${cleanGoal.toLowerCase()}.`,
      dueDate: deadlineISO,
      priority: 'medium',
      actionType: 'reminder',
      dependency: `step-${steps.length}`,
      status: 'pending',
    });
  } else if (isTravelGoal) {
    const dest = extractedDestination
      ? extractedDestination.charAt(0).toUpperCase() + extractedDestination.slice(1)
      : 'your destination';
    steps = [
      {
        id: 'step-1',
        title: `Check Passport & Visa for ${dest}`,
        description: `Verify your passport validity and check visa requirements for ${dest}. Apply early if needed.`,
        dueDate: earlyISO,
        priority: 'high',
        actionType: 'task',
        dependency: null,
        status: 'pending',
      },
      {
        id: 'step-2',
        title: `Book Flights & Accommodation to ${dest}`,
        description: `Research and book round-trip flights and hotel or accommodation in ${dest}.`,
        dueDate: earlyISO,
        priority: 'high',
        actionType: 'event',
        dependency: 'step-1',
        status: 'pending',
      },
      {
        id: 'step-3',
        title: 'Prepare Itinerary & Activities',
        description: `Plan your schedule and activities for your time in ${dest}. Research must-see spots and local customs.`,
        dueDate: midpointISO,
        priority: 'medium',
        actionType: 'task',
        dependency: 'step-2',
        status: 'pending',
      },
      {
        id: 'step-4',
        title: 'Prepare Packing List & Travel Documents',
        description: `Create a packing list. Ensure you have travel insurance, travel adapters, and all required documents.`,
        dueDate: midpointISO,
        priority: 'medium',
        actionType: 'note',
        dependency: 'step-2',
        status: 'pending',
      },
      {
        id: 'step-5',
        title: 'Arrange Transportation & Local Currency',
        description: `Arrange airport pickup/drop-off and exchange or prepare local currency for ${dest}.`,
        dueDate: midpointISO,
        priority: 'medium',
        actionType: 'task',
        dependency: 'step-3',
        status: 'pending',
      },
      {
        id: 'step-6',
        title: 'Set Pre-Departure Reminders',
        description: `Set reminders for flight check-in, hotel confirmation, and final packing check before departure.`,
        dueDate: deadlineISO,
        priority: 'high',
        actionType: 'reminder',
        dependency: 'step-5',
        status: 'pending',
      },
    ];
  } else if (/\b(interview|job\s+interview|job\s+application|hiring|apply\s+for)\b/i.test(lower)) {
    steps = [
      {
        id: 'step-1',
        title: 'Update CV & Cover Letter',
        description: 'Revise your CV to highlight relevant experience and write a tailored cover letter for the role.',
        dueDate: earlyISO,
        priority: 'high',
        actionType: 'task',
        dependency: null,
        status: 'pending',
      },
      {
        id: 'step-2',
        title: 'Research the Company',
        description: 'Study the company\'s mission, products, culture, and recent news to prepare informed answers.',
        dueDate: earlyISO,
        priority: 'high',
        actionType: 'task',
        dependency: null,
        status: 'pending',
      },
      {
        id: 'step-3',
        title: 'Prepare Interview Answers',
        description: 'Practice answers to common interview questions (tell me about yourself, strengths/weaknesses, situational questions).',
        dueDate: midpointISO,
        priority: 'high',
        actionType: 'task',
        dependency: 'step-2',
        status: 'pending',
      },
      {
        id: 'step-4',
        title: 'Choose Interview Outfit',
        description: 'Select and prepare appropriate professional attire for the interview.',
        dueDate: midpointISO,
        priority: 'medium',
        actionType: 'task',
        dependency: null,
        status: 'pending',
      },
      {
        id: 'step-5',
        title: 'Confirm Interview Details',
        description: 'Confirm interview time, format (in-person/video), location/link, and required documents.',
        dueDate: midpointISO,
        priority: 'medium',
        actionType: 'note',
        dependency: null,
        status: 'pending',
      },
      {
        id: 'step-6',
        title: 'Set Pre-Interview Reminder',
        description: 'Set a reminder the day before the interview for final preparation.',
        dueDate: deadlineISO,
        priority: 'high',
        actionType: 'reminder',
        dependency: 'step-3',
        status: 'pending',
      },
    ];
  } else if (/\b(exam|test|presentation|report|assignment|project\s+deadline|submission)\b/i.test(lower)) {
    steps = [
      {
        id: 'step-1',
        title: `Review Material for ${cleanGoal}`,
        description: `Gather and review all required material, notes, or resources for ${cleanGoal.toLowerCase()}.`,
        dueDate: earlyISO,
        priority: 'high',
        actionType: 'task',
        dependency: null,
        status: 'pending',
      },
      {
        id: 'step-2',
        title: 'Prepare & Practice',
        description: `Draft, practice, or study the key components needed for ${cleanGoal.toLowerCase()}.`,
        dueDate: midpointISO,
        priority: 'high',
        actionType: 'task',
        dependency: 'step-1',
        status: 'pending',
      },
      {
        id: 'step-3',
        title: 'Final Review',
        description: `Do a final review and check for completeness before the ${cleanGoal.toLowerCase()} deadline.`,
        dueDate: midpointISO,
        priority: 'medium',
        actionType: 'task',
        dependency: 'step-2',
        status: 'pending',
      },
      {
        id: 'step-4',
        title: `Set Deadline Reminder`,
        description: `Set a reminder the day before your ${cleanGoal.toLowerCase()} deadline.`,
        dueDate: deadlineISO,
        priority: 'high',
        actionType: 'reminder',
        dependency: 'step-3',
        status: 'pending',
      },
    ];
  } else {
    steps = [
      {
        id: 'step-1',
        title: `Plan & research ${cleanGoal}`,
        description: `Identify essential requirements and preliminary steps for ${cleanGoal.toLowerCase()}.`,
        dueDate: earlyISO,
        priority: 'high',
        actionType: 'task',
        dependency: null,
        status: 'pending',
      },
      {
        id: 'step-2',
        title: `Prepare & organize`,
        description: `Gather required resources, documents, or items needed for ${cleanGoal.toLowerCase()}.`,
        dueDate: midpointISO,
        priority: 'high',
        actionType: 'task',
        dependency: 'step-1',
        status: 'pending',
      },
      {
        id: 'step-3',
        title: `Execute & complete`,
        description: `Carry out the primary actions needed to achieve ${cleanGoal.toLowerCase()}.`,
        dueDate: midpointISO,
        priority: 'medium',
        actionType: 'task',
        dependency: 'step-2',
        status: 'pending',
      },
      {
        id: 'step-4',
        title: `Review & finalize`,
        description: `Confirm completion and follow-up on any remaining details for ${cleanGoal.toLowerCase()}.`,
        dueDate: deadlineISO,
        priority: 'low',
        actionType: 'task',
        dependency: 'step-3',
        status: 'pending',
      },
    ];
  }

  return {
    goal: cleanGoal,
    description: `Structured action roadmap for: ${cleanGoal}`,
    createdAt: new Date().toISOString(),
    status: 'draft',
    steps,
  };
}

export function classifyStepActionType(title: string, description: string): PlanStepActionType {
  const text = `${title} ${description}`.toLowerCase();

  if (/(book|reserve|flight|stay|hotel|accommodation|appointment|meeting|visit|interview)/i.test(text)) {
    return 'event';
  }

  if (/(set reminder|alert|notify|ping|reminder for|travel reminder)/i.test(text)) {
    return 'reminder';
  }

  if (/(packing list|documents|passwords|wifi|details|info to save|reference note|notes)/i.test(text)) {
    return 'note';
  }

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

  const processStep = async (step: PlanStep, i: number): Promise<void> => {
    if (step.status === 'completed') {
      return;
    }

    const actionType = step.actionType || classifyStepActionType(step.title, step.description);

    try {
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

          step.status = 'completed';
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

          step.status = 'completed';
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

          step.status = 'completed';
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

          step.status = 'completed';
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
    } catch (err: unknown) {
      step.status = 'failed';
      const errMsg = err instanceof Error ? err.message : String(err);
      executedSteps.push({
        stepTitle: step.title,
        actionType: step.actionType || 'task',
        summary: `Failed: ${errMsg}`,
      });
    }
  };

  const stepsToRun = plan.steps || [];
  const independentSteps: { step: PlanStep; index: number }[] = [];
  const dependentSteps: { step: PlanStep; index: number }[] = [];

  stepsToRun.forEach((step, index) => {
    if (!step.dependency) {
      independentSteps.push({ step, index });
    } else {
      dependentSteps.push({ step, index });
    }
  });

  if (independentSteps.length > 0) {
    await Promise.allSettled(independentSteps.map(({ step, index }) => processStep(step, index)));
  }

  for (const { step, index } of dependentSteps) {
    await processStep(step, index);
  }

  evaluatePlanDependencies(plan);

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
    if (step.status === 'completed' || step.status === 'failed') continue;

    if (step.dependency) {
      const depTarget = step.dependency.toLowerCase().trim();
      const prereq = steps.find(
        (s, idx) =>
          idx !== i &&
          ((s.id && s.id.toLowerCase().trim() === depTarget) ||
            s.title.toLowerCase().trim() === depTarget ||
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
      (s) =>
        (s.id && s.id.toLowerCase().trim() === targetLower) ||
        s.title.toLowerCase().trim() === targetLower ||
        s.title.toLowerCase().includes(targetLower)
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
