import { GoogleGenAI, Type } from '@google/genai';
import { AIInterpretationResult, AIIntent, AIChoice, UserContextSummary } from '../types/ai';
import { findAvailableTimeSlots, buildCalendarAvailabilityChoices } from './calendarIntelligence';
import { getWeatherForecast } from './weather';

export function isApiKeyConfigured(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  return !!(apiKey && apiKey !== 'your-gemini-api-key');
}

export function parseRescheduleTargetDateTime(
  prompt: string,
  originalStartISO: string,
  originalEndISO: string,
  now: Date
): { startAt: string; endAt: string; targetDescription: string } {
  const lower = prompt.toLowerCase();
  const origStart = new Date(originalStartISO);
  const origEnd = new Date(originalEndISO);
  const durationMs = Math.max(origEnd.getTime() - origStart.getTime(), 30 * 60 * 1000);

  let targetHour = origStart.getHours();
  let targetMinute = origStart.getMinutes();

  const timeMatch = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (timeMatch && (lower.includes('at ') || lower.includes('am') || lower.includes('pm') || timeMatch[2])) {
    let h = parseInt(timeMatch[1], 10);
    const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3]?.toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      targetHour = h;
      targetMinute = m;
    }
  }

  const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  let dayIndex = -1;
  for (let i = 0; i < DAYS.length; i++) {
    if (new RegExp(`\\b${DAYS[i]}\\b`, 'i').test(lower)) {
      dayIndex = i;
      break;
    }
  }

  let targetDate = new Date(now);

  if (dayIndex !== -1) {
    const currentDay = now.getDay();
    let daysDiff = (dayIndex - currentDay + 7) % 7;
    if (daysDiff === 0 || lower.includes('next')) {
      daysDiff += 7;
    }
    targetDate.setDate(now.getDate() + daysDiff);
  } else if (lower.includes('tomorrow')) {
    targetDate.setDate(now.getDate() + 1);
  } else if (lower.includes('today')) {
    // Keep today's date
  } else {
    targetDate = new Date(origStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (targetDate.getTime() < now.getTime()) {
      targetDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  targetDate.setHours(targetHour, targetMinute, 0, 0);
  const targetEnd = new Date(targetDate.getTime() + durationMs);

  const formattedDayStr = targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const formattedTimeStr = targetDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const isExplicitDay = dayIndex !== -1 || lower.includes('tomorrow') || lower.includes('today');
  const targetDescription = isExplicitDay
    ? `${formattedDayStr} at ${formattedTimeStr}`
    : `next week (${formattedDayStr} at ${formattedTimeStr})`;

  return {
    startAt: targetDate.toISOString(),
    endAt: targetEnd.toISOString(),
    targetDescription,
  };
}

export function matchContextItems(prompt: string, userContext?: UserContextSummary, referenceDateISO?: string): AIInterpretationResult | null {
  if (!userContext) return null;
  const lowerPrompt = prompt.toLowerCase();
  const isRelocationMove = /(move to a|move to my|moving to|move into|relocate)/i.test(lowerPrompt);
  const isMoveOrUpdate = !isRelocationMove && /(move|reschedule|shift|postpone|cancel|delete)\b/i.test(lowerPrompt);

  if (!isMoveOrUpdate) return null;

  const COMMON_VERBS = new Set([
    'prepare', 'plan', 'research', 'check', 'book', 'make', 'create', 'arrange',
    'schedule', 'review', 'complete', 'finalize', 'verify', 'confirm', 'organize',
    'ensure', 'gather', 'identify', 'execute', 'handle', 'manage', 'setup',
    'update', 'change', 'write', 'choose', 'select', 'build', 'learn', 'start',
    'with', 'from', 'that', 'this', 'have', 'will', 'would', 'need', 'want',
    'your', 'their', 'some', 'more', 'also', 'done', 'list', 'step', 'task',
    'next', 'last', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
    'saturday', 'sunday', 'today', 'tomorrow', 'week', 'month', 'year',
    'answer', 'answers', 'cover', 'letter', 'items', 'things', 'stuff',
  ]);

  const isSpecificNoun = (word: string): boolean => {
    if (word.length <= 4) return false;
    if (COMMON_VERBS.has(word)) return false;
    return true;
  };

  const matchingEvent = (userContext.events || []).find((e) => {
    const titleLower = e.title.toLowerCase();
    if (lowerPrompt.includes(titleLower)) return true;
    const specificWords = titleLower.split(/\s+/).filter(isSpecificNoun);
    const matchCount = specificWords.filter((word) => lowerPrompt.includes(word)).length;
    return matchCount >= 2 || (matchCount === 1 && specificWords.length === 1);
  });

  if (matchingEvent) {
    const formattedStart = new Date(matchingEvent.startAt).toLocaleString([], { weekday: 'long', hour: '2-digit', minute: '2-digit' });
    const now = referenceDateISO ? new Date(referenceDateISO) : new Date();
    const { startAt, endAt, targetDescription } = parseRescheduleTargetDateTime(
      prompt,
      matchingEvent.startAt,
      matchingEvent.endAt,
      now
    );

    return {
      intent: 'missing_information',
      confidence: 0.95,
      title: matchingEvent.title,
      startAt,
      endAt,
      targetItemId: matchingEvent.id,
      targetItemType: 'event',
      existingItemSummary: `${matchingEvent.title} — ${formattedStart}`,
      question: `Do you want to move your ${matchingEvent.title} (${formattedStart}) to ${targetDescription}?`,
      reasoning: 'Parsed reference to matching existing event in user context with updated target date/time',
      pendingClarification: {
        intent: 'update_event',
        targetItemId: matchingEvent.id,
        targetItemType: 'event',
        startAt,
        endAt,
      },
    };
  }

  const matchingTask = (userContext.tasks || []).find((t) => {
    const titleLower = t.title.toLowerCase();
    if (lowerPrompt.includes(titleLower)) return true;
    const specificWords = titleLower.split(/\s+/).filter(isSpecificNoun);
    const matchCount = specificWords.filter((word) => lowerPrompt.includes(word)).length;
    return matchCount >= 2 || (matchCount === 1 && specificWords.length === 1);
  });

  if (matchingTask) {
    return {
      intent: 'missing_information',
      confidence: 0.95,
      title: matchingTask.title,
      targetItemId: matchingTask.id,
      targetItemType: 'task',
      existingItemSummary: `Task: ${matchingTask.title}`,
      question: `Do you want to update your task "${matchingTask.title}"?`,
      reasoning: 'Parsed reference to matching existing task in user context',
      pendingClarification: {
        intent: 'update_task',
        targetItemId: matchingTask.id,
        targetItemType: 'task',
      },
    };
  }

  return null;
}

export async function interpretNaturalLanguage(
  prompt: string,
  referenceDateISO?: string,
  conversationHistory?: { role: string; text: string }[],
  userContext?: UserContextSummary
): Promise<AIInterpretationResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  const now = referenceDateISO ? new Date(referenceDateISO) : new Date();
  const currentDateStr = now.toISOString();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

  const timeZone = userContext?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localTimeStr = now.toLocaleString('en-US', { timeZoneName: 'short', timeZone });

  let userContextStr = '';
  if (userContext) {
    const tasksList = (userContext.tasks || []).map((t) => `- Task "${t.title}" (ID: ${t.id}${t.dueAt ? `, Due: ${t.dueAt}` : ''})`).join('\n');
    const eventsList = (userContext.events || []).map((e) => `- Event "${e.title}" (ID: ${e.id}, Start: ${e.startAt})`).join('\n');
    const notesList = (userContext.notes || []).map((n) => `- Note "${n.title}" (ID: ${n.id})`).join('\n');
    const remindersList = (userContext.reminders || []).map((r) => `- Reminder "${r.title || 'Reminder'}" (ID: ${r.id}, At: ${r.remindAt})`).join('\n');

    userContextStr = `
User's Current Existing Information:
Tasks:
${tasksList || 'None'}

Events:
${eventsList || 'None'}

Notes:
${notesList || 'None'}

Reminders:
${remindersList || 'None'}
`;
    if (userContext.userLocation) {
      userContextStr += `User Location: ${userContext.userLocation}\n`;
    }
  }

  const systemInstruction = `
You are the natural language understanding engine for LifeOS, a personal administrative assistant.
Analyze user inputs and map them to structured intents and parameters.

Current reference time context:
- Local Time: ${localTimeStr} (Timezone: ${timeZone})
- ISO UTC Timestamp: ${currentDateStr}
- Day of week: ${dayOfWeek}

${userContextStr}

CONTEXT & EXISTING INFORMATION RULES:
1. BEFORE creating a new task, event, reminder, or note, check if the user is referring to an existing item in the User's Current Existing Information list (e.g. "Move my dentist appointment to next week", "Reschedule my meeting", "Cancel grocery task").
2. If the user request refers to an existing item:
   - DO NOT create a new duplicate item.
   - If user asks to move/reschedule an item, set intent to "missing_information" (or "update_event"/"update_task") asking confirmation (e.g. question: "Do you want to move your dentist appointment (Friday, 3 PM) to next week?") AND set "targetItemId" to matching item ID.

TIME SCHEDULING RULES:
1. If the user specifies ANY relative time ("in 30 sec", "in 1 min", "after 5 mins", "in an hour") or absolute time ("at 3 pm"), calculate the exact ISO 8601 timestamp relative to the reference timestamp (${currentDateStr}).
2. NEVER map to "suggest_choices" or "missing_information" if a time or relative duration is provided. Map to "create_task" (with dueAt set to that timestamp) or "create_reminder" (with remindAt set to that timestamp).
3. If the user specifies a time today that has NOT yet passed, use TODAY (${now.toISOString().split('T')[0]}). Only use tomorrow if the time has already passed or user explicitly says "tomorrow".
4. Keep titles concise and clean (e.g. "Do something" or "Scheduled Item"). NEVER append instructions or prompt text into titles.
5. "suggest_choices" MUST ONLY be used when user input has NO time AND NO clear action (e.g., "I feel tired" or "New York").
6. CRITICAL RULE FOR EVENTS & ACTIVITIES: If the user mentions any event, date, game, test, meeting, appointment, class, or scheduled activity WITHOUT an explicit time of day (e.g., "i have a date tomorrow", "i have a game tomorrow", "i have a test"), YOU MUST SET intent to "missing_information" and question to "What time is [the event/date/game]?". NEVER generate a default startAt/endAt time!

Possible Intents:
1. "create_event": Scheduled calendar appointment or meeting tied to a specific time/date range. Required fields: title, startAt, endAt.
2. "create_task": Action item or to-do. Optional dueAt.
3. "create_note": Personal info, passwords, reference notes, or general facts to store. Required fields: title, content. IMPORTANT FOR NOTES: 'content' MUST be the verbatim user input text to save. NEVER output questions, placeholders, or text like '(Optional)' or 'Please specify...' in title or content.
4. "create_reminder": Explicit alert request for a task or standalone timestamp. Required fields: remindAt or reminderMinutesBefore.
5. "suggest_choices": Use this when user input is ambiguous, a general status update (e.g., "I am sick today", "I feel tired", "Going to New York"), or could be handled in multiple ways. Return intent "suggest_choices" with a polite message in "question" and 2 to 4 structured choices in "choices". Each choice must have "label", "type" ('task'|'note'|'event'|'reminder'), and full "interpretation" payload object.
6. "missing_information": The request intends a specific action but critical required info (like event time) is missing.
7. "create_plan": Multi-step goal, travel preparation, project, or major objective that involves multiple sub-actions (e.g., "I need to prepare for my trip to Nairobi next month", "I need to move to a new apartment next month", "Plan my trip"). Distinguish simple single tasks (e.g. "Buy groceries tomorrow") from multi-step goals. When intent is "create_plan", set "goal" to the main goal title (e.g. "Prepare for Nairobi trip"), and "possibleActions" to an array of 3 to 6 logical sub-action strings (e.g. ["Check passport", "Book accommodation", "Prepare packing list", "Set travel reminder"]).
8. "update_event": Reschedule or update an existing calendar appointment matching targetItemId.
9. "update_task": Reschedule or update an existing task matching targetItemId.
10. "delete_event": Remove or delete an existing calendar appointment matching targetItemId.
11. "delete_task": Remove or delete an existing task matching targetItemId.
12. "action_confirmation_required": Destructive or high-impact operation requiring explicit user confirmation before executing.
13. "weather_check": Checking weather forecast, rain expectations, or outdoor conditions for an event or location (e.g. "will it rain tomorrow during my event?", "what's the weather forecast?").
14. "unknown": Input is completely unintelligible.

Always output ISO 8601 format timestamps for dates/times (e.g., "2026-09-11T15:00:00.000Z").
`;

  const contextMatch = matchContextItems(prompt, userContext, referenceDateISO);
  if (contextMatch) {
    return contextMatch;
  }

  if (!isApiKeyConfigured()) {
    return heuristicFallbackParse(prompt, now, conversationHistory, userContext);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey! });
    const model = 'gemini-2.0-flash';

    let fullPrompt = prompt;
    if (conversationHistory && conversationHistory.length > 0) {
      const historyStr = conversationHistory.slice(-10).map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`).join('\n');
      fullPrompt = `Previous Conversation History:\n${historyStr}\n\nLatest User Follow-up Answer: ${prompt}`;
    }

    const response = await ai.models.generateContent({
      model,
      contents: fullPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: {
              type: Type.STRING,
              enum: [
                'create_task',
                'create_note',
                'create_event',
                'create_reminder',
                'suggest_choices',
                'missing_information',
                'create_plan',
                'update_event',
                'update_task',
                'delete_event',
                'delete_task',
                'action_confirmation_required',
                'weather_check',
                'unknown',
              ],
            },
            confidence: { type: Type.NUMBER },
            title: { type: Type.STRING },
            goal: { type: Type.STRING },
            targetItemId: { type: Type.STRING },
            targetItemType: { type: Type.STRING, enum: ['event', 'task', 'note', 'reminder'] },
            possibleActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            description: { type: Type.STRING },
            content: { type: Type.STRING },
            startAt: { type: Type.STRING },
            endAt: { type: Type.STRING },
            dueAt: { type: Type.STRING },
            remindAt: { type: Type.STRING },
            reminderMinutesBefore: { type: Type.NUMBER },
            missingFields: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            question: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            choices: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['task', 'note', 'event', 'reminder'] },
                  interpretation: {
                    type: Type.OBJECT,
                    properties: {
                      intent: { type: Type.STRING },
                      title: { type: Type.STRING },
                      content: { type: Type.STRING },
                      description: { type: Type.STRING },
                      startAt: { type: Type.STRING },
                      endAt: { type: Type.STRING },
                      dueAt: { type: Type.STRING },
                      remindAt: { type: Type.STRING },
                    },
                    required: ['intent', 'title'],
                  },
                },
                required: ['label', 'type', 'interpretation'],
              },
            },
          },
          required: ['intent', 'confidence'],
        },
      },
    });

    if (!response.text) {
      throw new Error('Empty response from Gemini AI model');
    }

    const parsed: AIInterpretationResult = JSON.parse(response.text);
    return await validateAndSanitizeResult(parsed, prompt, now);
  } catch (err: unknown) {
    console.error('Gemini AI API call failed, falling back to heuristic parser:', err);
    return await heuristicFallbackParse(prompt, now, conversationHistory, userContext);
  }
}

function sanitizeAIText(text?: string): string {
  if (!text) return '';

  let cleaned = text
    .replace(/\s*--\s*(Previous Turn|This is not a new response|Due to the extreme length|The provided text|The user's input|Please ensure that user turn|If this is a real password|I have truncated)[\s\S]*$/i, '')
    .replace(/\(truncated\)/gi, '')
    .replace(/\(max length \d+ chars\)/gi, '')
    .replace(/\(Optional\)\s*Please.*/gi, '')
    .replace(/\.?\s*Please schedule.*/gi, '')
    .replace(/\.?\s*Please provide.*/gi, '')
    .replace(/--\s*This is a very long[\s\S]*$/i, '')
    .replace(/^["']|["']$/g, '')
    .trim();

  return cleaned;
}

function sanitizeTitle(title?: string, fallbackPrompt?: string): string {
  let clean = sanitizeAIText(title);
  if (!clean || clean.length < 2 || /\(Optional\)/i.test(clean) || clean.endsWith('?')) {
    const lower = (fallbackPrompt || '').toLowerCase();
    if (lower.includes('wifi')) clean = 'WiFi Information';
    else if (lower.includes('password')) clean = 'Password Note';
    else clean = sanitizeAIText(fallbackPrompt) || 'Saved Note';
  }
  if (clean.length > 50) {
    clean = clean.slice(0, 47).trim() + '...';
  }
  return clean;
}

export function hasExplicitTimeOfDay(text: string): boolean {
  const lower = text.toLowerCase();
  if (/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i.test(lower)) return true;
  if (/\b(?:at\s+)?(?:[01]?\d|2[0-3]):[0-5]\d\b/i.test(lower)) return true;
  if (/\bat\s+\d{1,2}\b/i.test(lower)) return true;
  if (/(?:in|after|for)\s+(?:\d+|a|an|one)\s*(?:sec|second|min|minute|hr|hour)s?\b/i.test(lower)) return true;
  if (/\b(morning|afternoon|evening|night|midnight|noon|midday)\b/i.test(lower)) return true;
  return false;
}

export function timeOfDayWordToHour(text: string): number | null {
  const lower = text.toLowerCase();
  if (/\bmorning\b/.test(lower)) return 9;
  if (/\bnoon\b|\bmidday\b/.test(lower)) return 12;
  if (/\bafternoon\b/.test(lower)) return 14;
  if (/\bevening\b/.test(lower)) return 18;
  if (/\bnight\b/.test(lower)) return 21;
  if (/\bmidnight\b/.test(lower)) return 0;
  return null;
}

async function validateAndSanitizeResult(result: AIInterpretationResult, prompt: string, now: Date): Promise<AIInterpretationResult> {
  const validIntents: AIIntent[] = [
    'create_task',
    'create_note',
    'create_event',
    'create_reminder',
    'suggest_choices',
    'missing_information',
    'create_plan',
    'update_event',
    'update_task',
    'delete_event',
    'delete_task',
    'action_confirmation_required',
    'weather_check',
    'unknown',
  ];

  if (!validIntents.includes(result.intent)) {
    result.intent = 'suggest_choices';
  }

  if (result.confidence !== undefined && result.confidence < 0.6) {
    const commitIntents = [
      'create_task',
      'create_note',
      'create_event',
      'create_reminder',
      'create_plan',
      'update_event',
      'update_task',
      'delete_event',
      'delete_task',
    ];
    if (commitIntents.includes(result.intent)) {
      result.intent = 'suggest_choices';
      if (!result.question) {
        result.question = `I'm not fully sure how to handle "${prompt}". Select an option below:`;
      }
      result.choices = generateDefaultChoices(prompt, now);
    }
  }

  if (result.intent === 'weather_check' && !result.weatherForecast) {
    result.weatherForecast = await getWeatherForecast();
  }

  if (result.intent === 'create_plan') {
    if (!result.goal) {
      result.goal = sanitizeTitle(result.title, prompt);
    }
    if (!result.possibleActions || !Array.isArray(result.possibleActions) || result.possibleActions.length === 0) {
      result.possibleActions = [
        `Research details for ${result.goal}`,
        `Create task list for ${result.goal}`,
        `Set travel/preparation reminders`,
      ];
    }
  }

  if (result.intent === 'create_note') {
    const isQuestionOrPlaceholder = !result.content ||
      /\(Optional\)/i.test(result.content) ||
      /Please provide/i.test(result.content) ||
      result.content.endsWith('?');

    if (isQuestionOrPlaceholder) {
      result.content = prompt;
    }

    result.title = sanitizeTitle(result.title, prompt);
  } else {
    if (result.title) {
      result.title = sanitizeTitle(result.title, prompt);
    }
    if (result.content) {
      result.content = sanitizeAIText(result.content) || prompt;
    }
  }

  if (result.description) {
    result.description = sanitizeAIText(result.description);
  }

  const lowerP = prompt.toLowerCase();
  const hasSeqSteps = /\b(first[,.]?\s+(?:i\s+)?(?:need\s+to|want\s+to|will)?\s*\w+.+(?:then|next|after\s+that|finally)\b|(?:then|next)\b.+(?:then|next|finally)\b)/i.test(lowerP);
  const hasTravelSignal = /\b(need\s+to\s+travel|travel\s+(?:next|this|in)|trip\s+(?:next|this)|going\s+to\s+travel)\b/i.test(lowerP);
  if ((hasSeqSteps || hasTravelSignal) && result.intent !== 'create_plan') {
    let goal = result.title || sanitizeTitle(undefined, prompt);
    result.intent = 'create_plan';
    result.goal = goal;
    result.title = goal;
    if (!result.possibleActions || result.possibleActions.length === 0) {
      result.possibleActions = [`Research requirements`, `Prepare resources`, `Execute milestones`, `Verify completion`];
    }
  }

  if (result.intent === 'create_event') {
    if (!hasExplicitTimeOfDay(prompt)) {
      const cleanTitle = sanitizeTitle(result.title, prompt);
      result.intent = 'missing_information';
      result.title = cleanTitle;
      result.missingFields = ['startTime'];
      result.question = `What time is "${cleanTitle}"?`;
    } else {
      if (result.startAt && !result.endAt) {
        const startDate = new Date(result.startAt);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        result.endAt = endDate.toISOString();
      }
    }
  }

  if (result.intent === 'unknown' || result.intent === 'suggest_choices') {
    result.intent = 'suggest_choices';
    if (!result.question) {
      result.question = `How would you like to save or handle "${prompt}"?`;
    }
    if (!result.choices || result.choices.length === 0) {
      result.choices = generateDefaultChoices(prompt, now);
    }
  }

  return result;
}

export function generateDefaultChoices(prompt: string, now: Date): AIChoice[] {
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const startAt = new Date(tomorrow);
  startAt.setHours(15, 0, 0, 0);
  const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

  const remindAt = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  const titleCap = prompt.charAt(0).toUpperCase() + prompt.slice(1);

  return [
    {
      label: `Save as Note: "${titleCap}"`,
      type: 'note',
      interpretation: {
        intent: 'create_note',
        confidence: 0.95,
        title: titleCap,
        content: prompt,
      },
    },
    {
      label: `Add Task: "Handle '${titleCap}'"`,
      type: 'task',
      interpretation: {
        intent: 'create_task',
        confidence: 0.95,
        title: `Handle '${titleCap}'`,
        dueAt: tomorrow.toISOString(),
      },
    },
    {
      label: `Schedule Event for Tomorrow`,
      type: 'event',
      interpretation: {
        intent: 'create_event',
        confidence: 0.95,
        title: titleCap,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      },
    },
    {
      label: `Set Reminder in 4 hours`,
      type: 'reminder',
      interpretation: {
        intent: 'create_reminder',
        confidence: 0.95,
        title: titleCap,
        remindAt: remindAt.toISOString(),
      },
    },
  ];
}

export function parseTimeFromText(text: string, now: Date): Date | null {
  const lower = text.toLowerCase();
  let totalMs = 0;
  let matchedDuration = false;

  const hrMatch = lower.match(/(?:in|after|for)?\s*(\d+)\s*(?:hrs?|hours?)/i) || lower.match(/(?:in|after|for)\s+(?:a|an|one|1)\s*(?:hr|hour)/i);
  if (hrMatch) {
    const hrs = hrMatch[1] && !isNaN(parseInt(hrMatch[1], 10)) ? parseInt(hrMatch[1], 10) : 1;
    totalMs += hrs * 60 * 60 * 1000;
    matchedDuration = true;
  }

  const minMatch = lower.match(/(?:in|after|for)?\s*(\d+)\s*(?:mins?|minutes?)/i) || lower.match(/(?:in|after|for)\s+(?:a|an|one|1)\s*(?:min|minute)/i);
  if (minMatch) {
    const mins = minMatch[1] && !isNaN(parseInt(minMatch[1], 10)) ? parseInt(minMatch[1], 10) : 1;
    totalMs += mins * 60 * 1000;
    matchedDuration = true;
  } else if (lower.includes('half an hour')) {
    totalMs += 30 * 60 * 1000;
    matchedDuration = true;
  }

  const secMatch = lower.match(/(?:in|after|for)?\s*(\d+)\s*(?:secs?|seconds?)/i) || lower.match(/(?:in|after|for)\s+(?:a|an|one|1)\s*(?:sec|second)/i);
  if (secMatch) {
    const secs = secMatch[1] && !isNaN(parseInt(secMatch[1], 10)) ? parseInt(secMatch[1], 10) : 30;
    totalMs += secs * 1000;
    matchedDuration = true;
  }

  if (matchedDuration && totalMs > 0) {
    return new Date(now.getTime() + totalMs);
  }

  const timeMatch = lower.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(pm|am)/i);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3]?.toLowerCase();

    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;

    const target = new Date(now);
    target.setHours(hour, minute, 0, 0);

    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    return target;
  }

  const time24Match = lower.match(/(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)/i);
  if (time24Match) {
    const hour = parseInt(time24Match[1], 10);
    const minute = parseInt(time24Match[2], 10);

    const target = new Date(now);
    target.setHours(hour, minute, 0, 0);

    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    return target;
  }

  return null;
}

export function cleanReminderTitle(prompt: string): string {
  let clean = prompt
    .replace(/^(please\s+)?(remind|notify|ping|alert|warn)\s+(me\s+)?/i, '')
    .replace(/(?:in|after|for)?\s*(?:\d+|a|an|one)\s*(?:mins?|minutes?|secs?|seconds?|hrs?|hours?)/gi, '')
    .replace(/(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:pm|am)?/gi, '')
    .replace(/^(to\s+|about\s+|that\s+)/i, '')
    .trim();

  if (!clean || clean.length < 2) {
    return 'Scheduled Reminder';
  }
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

async function heuristicFallbackParse(
  prompt: string,
  now: Date,
  conversationHistory?: { role: string; text: string }[],
  userContext?: UserContextSummary
): Promise<AIInterpretationResult> {
  const lower = prompt.toLowerCase();

  const isWeatherQuery = /(weather|rain|forecast|outdoor condition|will it rain|is it going to rain)/i.test(lower);
  if (isWeatherQuery) {
    const forecast = await getWeatherForecast();
    return {
      intent: 'weather_check',
      confidence: 0.95,
      title: 'Weather Check',
      weatherForecast: forecast,
      reasoning: 'Parsed weather check / rain forecast query from fallback heuristic',
    };
  }

  const isDeleteAction = /(delete|remove|cancel|erase)\s+(my\s+)?(.+)/i.test(lower);
  const isAffirmativeTurn = /^(yes|yeah|sure|confirm|do it|go ahead|ok)\b/i.test(lower.trim());
  if (isDeleteAction && !isAffirmativeTurn) {
    const rawMatch = prompt.replace(/^(please\s+)?(delete|remove|cancel|erase)\s+(my\s+)?/i, '').trim();
    const cleanTitle = rawMatch ? rawMatch.charAt(0).toUpperCase() + rawMatch.slice(1) : 'Item';
    return {
      intent: 'action_confirmation_required',
      confidence: 0.95,
      title: cleanTitle,
      question: `Are you sure you want to delete "${cleanTitle}"?`,
      confirmationMessage: `This action will permanently delete "${cleanTitle}".`,
      requiresConfirmation: true,
      pendingAction: {
        intent: 'delete_event',
        confidence: 0.95,
        title: cleanTitle,
      },
      reasoning: 'Action Confirmation Rule: Destructive operations require user confirmation before execution',
    };
  }

  const contextMatch = matchContextItems(prompt, userContext);
  if (contextMatch) {
    return contextMatch;
  }

  if (conversationHistory && conversationHistory.length > 0) {
    const lastAssistantMsg = [...conversationHistory].reverse().find((h) => h.role === 'assistant');
    const firstUserMsg = conversationHistory.find((h) => h.role === 'user')?.text || 'Event';
    const assistantText = lastAssistantMsg?.text?.toLowerCase() || '';

    const isAffirmative = /^(yes|yeah|sure|yep|confirm|do it|go ahead|move it|update it|ok|okay)\b/i.test(lower.trim());
    if (isAffirmative && (assistantText.includes('move') || assistantText.includes('update') || assistantText.includes('reschedule') || assistantText.includes('dentist'))) {
      const matchItemTitle = assistantText.match(/(?:move|update|reschedule)\s+(?:your\s+)?([^?(]+)/i);
      const title = matchItemTitle ? matchItemTitle[1].trim() : (firstUserMsg || 'Event');
      return {
        intent: 'update_event',
        confidence: 0.95,
        title,
        reasoning: 'Stateful multi-turn follow-up: user confirmed moving/updating existing item',
      };
    }

    const isChoiceAnswer = /^(note|save as note|task|add task|event|schedule event|reminder|set reminder|1|2|3|4|first|second|third)\b/i.test(lower.trim());
    if (isChoiceAnswer && (assistantText.includes('how would you like') || assistantText.includes('handle this') || assistantText.includes('choices') || assistantText.includes('suggestions'))) {
      if (lower.includes('note')) {
        return {
          intent: 'create_note',
          confidence: 0.95,
          title: firstUserMsg ? (firstUserMsg.length > 30 ? firstUserMsg.slice(0, 27) + '...' : firstUserMsg) : 'Saved Note',
          content: firstUserMsg || prompt,
          reasoning: 'Stateful multi-turn follow-up: user selected Note choice',
        };
      } else if (lower.includes('task')) {
        return {
          intent: 'create_task',
          confidence: 0.95,
          title: `Handle '${firstUserMsg ? (firstUserMsg.length > 30 ? firstUserMsg.slice(0, 27) + '...' : firstUserMsg) : 'Task'}'`,
          dueAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          reasoning: 'Stateful multi-turn follow-up: user selected Task choice',
        };
      }
    }

    const askedForTime = assistantText.includes('time') || assistantText.includes('what time') || assistantText.includes('when');
    const looksLikeTimeAnswer = /\d/.test(lower) || lower.includes('pm') || lower.includes('am') || lower.includes('at') ||
      /\b(morning|afternoon|evening|night|noon|midnight)\b/.test(lower);

    if (askedForTime && looksLikeTimeAnswer) {
      const allUserText = conversationHistory.filter((h) => h.role === 'user').map((h) => h.text).join(' ').toLowerCase();
      const prevTodHour = timeOfDayWordToHour(allUserText);

      const compactMatch = lower.match(/\b(\d{3,4})\b/);
      let hour: number;
      let minute = 0;

      if (compactMatch && !lower.includes(':')) {
        const digits = compactMatch[1];
        if (digits.length === 3) {
          hour = parseInt(digits.slice(0, 1), 10);
          minute = parseInt(digits.slice(1), 10);
        } else {
          hour = parseInt(digits.slice(0, 2), 10);
          minute = parseInt(digits.slice(2), 10);
        }
      } else {
        const hourMatch = lower.match(/(\d{1,2})(?::(\d{2}))?/);
        hour = hourMatch ? parseInt(hourMatch[1], 10) : (prevTodHour ?? 9);
        minute = hourMatch?.[2] ? parseInt(hourMatch[2], 10) : 0;
      }

      if (minute >= 60) minute = 0;
      if (hour > 23) hour = hour % 24;

      const isEveningEvent = /(party|dinner|concert|movie|show|hangout|drink|night)/i.test(allUserText);
      if (lower.includes('pm') && hour < 12) {
        hour += 12;
      } else if (lower.includes('am') && hour === 12) {
        hour = 0;
      } else if (!lower.includes('pm') && !lower.includes('am')) {
        if (isEveningEvent && hour >= 1 && hour <= 11) {
          hour += 12;
        } else if (prevTodHour !== null && prevTodHour >= 12 && hour >= 1 && hour <= 11) {
          hour += 12;
        }
      }

      const mentionedTomorrow = allUserText.includes('tomorrow');
      const mentionedNextWeek = allUserText.includes('next week');
      const start = new Date(now);
      if (mentionedNextWeek) {
        start.setDate(start.getDate() + 7);
      } else if (mentionedTomorrow) {
        start.setDate(start.getDate() + 1);
      }
      start.setHours(hour, minute, 0, 0);

      if (start.getTime() <= now.getTime() && !mentionedTomorrow) {
        start.setDate(start.getDate() + 1);
      }

      const end = new Date(start.getTime() + 60 * 60 * 1000);

      const eventNounMatch = firstUserMsg.match(/\b(appointment|dentist|doctor|meeting|flight|date|interview|test|party|dinner|lunch|concert|event|game|class|match|show|movie|hangout)\b/i);
      const title = eventNounMatch
        ? eventNounMatch[1].charAt(0).toUpperCase() + eventNounMatch[1].slice(1)
        : firstUserMsg.charAt(0).toUpperCase() + firstUserMsg.slice(1);

      return {
        intent: 'create_event',
        confidence: 0.9,
        title,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        reasoning: 'Fallback heuristic: merged follow-up time answer with previous conversation context',
      };
    }
  }

  const hasSequentialSteps = /\b(first[,.]?\s+(?:i\s+)?(?:need\s+to|want\s+to|will|i'll)?\s*\w+.+(?:then|next|after\s+that|finally)\b|(?:then|next)\b.+(?:then|next|finally)\b)/i.test(lower);
  const isGoalPhrase = hasSequentialSteps || /(prepare for|plan for|plan my|moving to|move to|relocate|trip to|travel to|need\s+to\s+travel|travel\s+(?:next|this|in)|going\s+to\s+travel|vacation|project to|organize my|help me prepare|prepare to|need to prepare|need to move|need to buy|want to buy|need to get|want to get|get my|buy a car|buy a house|buy a vehicle|buy an apartment)/i.test(lower);
  const isMinorTask = /^(buy|pick up|clean|call|email|text|send)\s+(milk|groceries|coffee|mom|dad|laundry|friend|doctor|dentist|dish)/i.test(lower);

  if (isGoalPhrase && !isMinorTask) {
    let cleanGoal = prompt
      .replace(/^i\s+(need\s+to|want\s+to|should|would\s+like\s+to)\s+/i, '')
      .replace(/^(prepare\s+for|plan\s+for|organize)\s+/i, '')
      .trim();

    if (!cleanGoal || cleanGoal.length < 3) cleanGoal = prompt;
    cleanGoal = cleanGoal.charAt(0).toUpperCase() + cleanGoal.slice(1);

    return {
      intent: 'create_plan',
      confidence: 0.95,
      goal: cleanGoal,
      title: cleanGoal,
      possibleActions: [
        `Research requirements for ${cleanGoal}`,
        `Prepare documentation & resources`,
        `Execute main milestone`,
        `Verify & finalize completion`,
      ],
      reasoning: 'Parsed multi-step goal intent dynamically',
    };
  }

  const eventWordMatch = lower.match(/\b(dentist appointment|doctor appointment|appointment|dentist|doctor|meeting|flight|date|interview|test|party|dinner|lunch|concert|event|game|class|match|show|movie|hangout)\b/i);
  const isEventWord = !!eventWordMatch;
  if (isEventWord) {
    const rawMatched = eventWordMatch![1];
    let nounTitle = rawMatched.charAt(0).toUpperCase() + rawMatched.slice(1);
    if (lower.includes('dentist appointment')) nounTitle = 'Dentist appointment';
    else if (lower.includes('doctor appointment')) nounTitle = 'Doctor appointment';

    const hasNumericTime = /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/i.test(lower) || /\bat\s+\d{1,2}\b/i.test(lower);
    const todMatch = lower.match(/\b(morning|afternoon|evening)\b/i);

    if (!hasNumericTime && todMatch) {
      const tod = todMatch[1].toLowerCase() as 'morning' | 'afternoon' | 'evening';
      const targetDate = new Date(now);
      if (lower.includes('tomorrow')) {
        targetDate.setDate(targetDate.getDate() + 1);
      }

      const existingEventsSummary = (userContext?.events || []).map((e) => ({
        title: e.title,
        startAt: e.startAt,
        endAt: e.endAt,
      }));

      const availableSlots = findAvailableTimeSlots(targetDate, existingEventsSummary, tod);
      if (availableSlots.length > 0) {
        let cleanTitle = prompt
          .replace(/^schedule\s+(a\s+)?(meeting\s+with\s+|dinner\s+with\s+|lunch\s+with\s+)?/i, '')
          .replace(/\s*(tomorrow|today|this|next)?\s*(morning|afternoon|evening).*/i, '')
          .trim();

        if (!cleanTitle || cleanTitle.length < 2) cleanTitle = nounTitle;
        cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
        const personMatch = lower.match(/with\s+([a-z]+)/i);
        if (personMatch && !cleanTitle.toLowerCase().includes(personMatch[1].toLowerCase())) {
          cleanTitle = `Meeting with ${personMatch[1].charAt(0).toUpperCase() + personMatch[1].slice(1)}`;
        }

        const choicesData = buildCalendarAvailabilityChoices(cleanTitle, availableSlots);
        return {
          intent: 'suggest_choices',
          confidence: 0.95,
          question: choicesData.question,
          choices: choicesData.choices,
          reasoning: 'Calendar Intelligence: checked calendar availability and suggested open time options',
        };
      }
    }

    if (!hasExplicitTimeOfDay(prompt)) {
      return {
        intent: 'missing_information',
        confidence: 0.95,
        title: nounTitle,
        missingFields: ['startTime'],
        question: `What time is your ${rawMatched}?`,
        reasoning: 'Detected event/date/appointment without explicit time of day',
      };
    }

    const timeMatch = prompt.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    const todHour = timeOfDayWordToHour(prompt);

    let hour: number;
    let minute = 0;
    if (timeMatch) {
      hour = parseInt(timeMatch[1], 10);
      minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampm = timeMatch[3]?.toLowerCase();
      if (ampm === 'pm' && hour < 12) hour += 12;
      if (ampm === 'am' && hour === 12) hour = 0;
      if (!ampm && hour >= 1 && hour <= 6 && todHour !== null) {
        hour = todHour < 12 ? hour : hour + 12;
      }
    } else if (todHour !== null) {
      hour = todHour;
    } else {
      hour = 9;
    }

    const start = new Date(now);
    if (lower.includes('tomorrow')) {
      start.setDate(start.getDate() + 1);
    } else if (lower.includes('friday')) {
      const day = start.getDay();
      const diff = (5 - day + 7) % 7 || 7;
      start.setDate(start.getDate() + diff);
    }
    start.setHours(hour, minute, 0, 0);

    if (start.getTime() < now.getTime() && !lower.includes('tomorrow') && !lower.includes('friday')) {
      start.setDate(start.getDate() + 1);
    }

    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const hasReminder = lower.includes('remind') || lower.includes('alert') || lower.includes('let me know');
    let reminderMinutesBefore: number | undefined = undefined;
    if (hasReminder) {
      if (lower.includes('one hour before') || lower.includes('1 hour before') || lower.includes('an hour before')) {
        reminderMinutesBefore = 60;
      } else if (lower.includes('30 min')) {
        reminderMinutesBefore = 30;
      } else if (lower.includes('15 min')) {
        reminderMinutesBefore = 15;
      } else if (lower.includes('2 hour')) {
        reminderMinutesBefore = 120;
      } else {
        reminderMinutesBefore = 60;
      }
    }

    return {
      intent: 'create_event',
      confidence: 0.9,
      title: nounTitle,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      reminderMinutesBefore,
      reasoning: 'Parsed event start time from prompt context',
    };
  }

  if (lower.includes('password') || lower.includes('wifi') || lower.includes('note:') || lower.includes('remember that') || lower.includes('secret') || lower.includes('code')) {
    let cleanTitle = 'Saved Note';
    if (lower.includes('wifi') && lower.includes('password')) cleanTitle = 'WiFi Password';
    else if (lower.includes('wifi')) cleanTitle = 'WiFi Info';
    else if (lower.includes('password')) cleanTitle = 'Password Note';
    else cleanTitle = prompt.slice(0, 30);

    return {
      intent: 'create_note',
      confidence: 0.9,
      title: cleanTitle,
      content: prompt,
      reasoning: 'Fallback heuristic: detected note / information keywords',
    };
  }

  const isNotificationIntent = /(notify|remind|ping|alert|let me know|warn|tell me|wake me|heads up)/i.test(lower);
  if (isNotificationIntent) {
    let remindDate = parseTimeFromText(prompt, now);
    if (!remindDate) {
      remindDate = new Date(now.getTime() + 60 * 60 * 1000);
    }

    const title = cleanReminderTitle(prompt);

    return {
      intent: 'create_reminder',
      confidence: 0.95,
      title,
      remindAt: remindDate.toISOString(),
      reasoning: 'Parsed notification/reminder intent',
    };
  }

  const parsedTime = parseTimeFromText(prompt, now);
  const isTaskAction = /(do|have|need|got|must|should|buy|todo|clean|submit|call|go|get|prepare|finish|task)/i.test(lower);

  if (parsedTime || isTaskAction) {
    const due = parsedTime || new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const title = prompt.length > 50 ? prompt.slice(0, 47).trim() + '...' : prompt;

    const isShortTime = parsedTime && (parsedTime.getTime() - now.getTime() <= 10 * 60 * 1000);

    if (isShortTime) {
      return {
        intent: 'create_reminder',
        confidence: 0.95,
        title: cleanReminderTitle(prompt),
        remindAt: due.toISOString(),
        reasoning: 'Parsed short-duration task/reminder intent',
      };
    }

    return {
      intent: 'create_task',
      confidence: 0.9,
      title: title.charAt(0).toUpperCase() + title.slice(1),
      dueAt: due.toISOString(),
      remindAt: due.toISOString(),
      reasoning: 'Parsed task intent with scheduled time',
    };
  }

  return {
    intent: 'suggest_choices',
    confidence: 0.8,
    question: `What would you like me to do with "${prompt}"?`,
    choices: generateDefaultChoices(prompt, now),
    reasoning: 'Ambiguous statement parsed into interactive choice suggestions',
  };
}
