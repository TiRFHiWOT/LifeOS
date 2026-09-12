import { GoogleGenAI, Type } from '@google/genai';
import { AIInterpretationResult, AIIntent, AIChoice } from '../types/ai';

export async function interpretNaturalLanguage(
  prompt: string,
  referenceDateISO?: string,
  conversationHistory?: { role: string; text: string }[]
): Promise<AIInterpretationResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  const now = referenceDateISO ? new Date(referenceDateISO) : new Date();
  const currentDateStr = now.toISOString();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localTimeStr = now.toLocaleString('en-US', { timeZoneName: 'short' });

  const systemInstruction = `
You are the natural language understanding engine for LifeOS, a personal administrative assistant.
Analyze user inputs and map them to structured intents and parameters.

Current reference time context:
- Local Time: ${localTimeStr} (Timezone: ${timeZone})
- ISO UTC Timestamp: ${currentDateStr}
- Day of week: ${dayOfWeek}

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
7. "unknown": Input is completely unintelligible.

Always output ISO 8601 format timestamps for dates/times (e.g., "2026-09-11T15:00:00.000Z").
`;

  if (!apiKey || apiKey === 'your-gemini-api-key') {
    return heuristicFallbackParse(prompt, now, conversationHistory);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.0-flash';

    let fullPrompt = prompt;
    if (conversationHistory && conversationHistory.length > 0) {
      const historyStr = conversationHistory.map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`).join('\n');
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
                'unknown',
              ],
            },
            confidence: { type: Type.NUMBER },
            title: { type: Type.STRING },
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
    return validateAndSanitizeResult(parsed, prompt, now);
  } catch (err: unknown) {
    console.error('Gemini AI API call failed, falling back to heuristic parser:', err);
    return heuristicFallbackParse(prompt, now, conversationHistory);
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
  // Time-of-day words count as explicit time signals
  if (/\b(morning|afternoon|evening|night|midnight|noon|midday)\b/i.test(lower)) return true;
  return false;
}

/**
 * Maps a time-of-day word to a default hour (24h).
 * morning=9, afternoon=14, evening=18, night=21, noon=12, midnight=0
 */
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

function validateAndSanitizeResult(result: AIInterpretationResult, prompt: string, now: Date): AIInterpretationResult {
  const validIntents: AIIntent[] = [
    'create_task',
    'create_note',
    'create_event',
    'create_reminder',
    'suggest_choices',
    'missing_information',
    'unknown',
  ];

  if (!validIntents.includes(result.intent)) {
    result.intent = 'suggest_choices';
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

  if (result.intent === 'create_event') {
    // If prompt lacks an explicit time of day, DO NOT use a default time! Ask the user!
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
    result.question = `How would you like to save or handle "${prompt}"?`;
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

  const remindAt = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hrs from now

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

  // Relative seconds e.g. "30 sec", "in 30 seconds", "after 10 sec", "a second"
  const secMatch = lower.match(/(?:in|after|for)?\s*(\d+)\s*(?:secs?|seconds?)/i);
  if (secMatch) {
    const secs = parseInt(secMatch[1], 10);
    return new Date(now.getTime() + secs * 1000);
  }

  const oneSecMatch = lower.match(/(?:in|after|for)\s+(?:a|an|one|1)\s*(?:sec|second)/i);
  if (oneSecMatch) {
    return new Date(now.getTime() + 30 * 1000);
  }

  // Relative minutes e.g. "30 min", "in 5 minutes", "after a minute"
  const minMatch = lower.match(/(?:in|after|for)?\s*(\d+)\s*(?:mins?|minutes?)/i);
  if (minMatch) {
    const mins = parseInt(minMatch[1], 10);
    return new Date(now.getTime() + mins * 60 * 1000);
  }

  const oneMinMatch = lower.match(/(?:in|after|for)\s+(?:a|an|one|1)\s*(?:min|minute)/i);
  if (oneMinMatch) {
    return new Date(now.getTime() + 1 * 60 * 1000);
  }

  if (lower.includes('half an hour')) {
    return new Date(now.getTime() + 30 * 60 * 1000);
  }

  // Relative hours e.g. "in 2 hours", "after 1 hour", "an hour"
  const hourRelMatch = lower.match(/(?:in|after|for)?\s*(\d+)\s*(?:hrs?|hours?)/i);
  if (hourRelMatch) {
    const hrs = parseInt(hourRelMatch[1], 10);
    return new Date(now.getTime() + hrs * 60 * 60 * 1000);
  }

  const oneHourMatch = lower.match(/(?:in|after|for)\s+(?:a|an|one|1)\s*(?:hr|hour)/i);
  if (oneHourMatch) {
    return new Date(now.getTime() + 60 * 60 * 1000);
  }

  // Explicit time e.g. "at 8:30 pm", "at 3 pm", "3pm"
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

  // 24-hour format e.g. "at 16:00"
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

function heuristicFallbackParse(
  prompt: string,
  now: Date,
  conversationHistory?: { role: string; text: string }[]
): AIInterpretationResult {
  const lower = prompt.toLowerCase();

  // If there's conversation history where assistant asked for time, merge context!
  if (conversationHistory && conversationHistory.length > 0) {
    const lastAssistantMsg = [...conversationHistory].reverse().find((h) => h.role === 'assistant');
    const firstUserMsg = conversationHistory.find((h) => h.role === 'user')?.text || 'Event';
    const assistantText = lastAssistantMsg?.text?.toLowerCase() || '';

    const askedForTime = assistantText.includes('time') || assistantText.includes('what time') || assistantText.includes('when');
    const looksLikeTimeAnswer = /\d/.test(lower) || lower.includes('pm') || lower.includes('am') || lower.includes('at') ||
      /\b(morning|afternoon|evening|night|noon|midnight)\b/.test(lower);

    if (askedForTime && looksLikeTimeAnswer) {
      // Extract time-of-day context from previous user messages to disambiguate AM/PM
      const allUserText = conversationHistory.filter((h) => h.role === 'user').map((h) => h.text).join(' ').toLowerCase();
      const prevTodHour = timeOfDayWordToHour(allUserText);

      const hourMatch = lower.match(/(\d{1,2})(?::(\d{2}))?/);
      let hour = hourMatch ? parseInt(hourMatch[1], 10) : (prevTodHour ?? 9);
      let minute = hourMatch?.[2] ? parseInt(hourMatch[2], 10) : 0;

      if (lower.includes('pm') && hour < 12) {
        hour += 12;
      } else if (lower.includes('am') && hour === 12) {
        hour = 0;
      } else if (!lower.includes('pm') && !lower.includes('am')) {
        // No explicit AM/PM — use context from earlier messages
        if (prevTodHour !== null && prevTodHour < 12) {
          // Previous context was morning → keep hour as-is (AM)
        } else if (prevTodHour !== null && prevTodHour >= 12) {
          // Previous context was afternoon/evening → push to PM if ambiguous
          if (hour >= 1 && hour <= 6) hour += 12;
        } else {
          // No context at all: hours 1-6 are ambiguous, default to AM for early hours
          // (people saying "4" usually mean 4 AM if no prior afternoon context)
        }
      }

      // Determine date: check if previous user message mentioned tomorrow
      const mentionedTomorrow = allUserText.includes('tomorrow');
      const start = new Date(now);
      if (mentionedTomorrow) start.setDate(start.getDate() + 1);
      start.setHours(hour, minute, 0, 0);

      // If resolved time has already passed today and tomorrow wasn't mentioned, move to tomorrow
      if (start.getTime() <= now.getTime() && !mentionedTomorrow) {
        start.setDate(start.getDate() + 1);
      }

      const end = new Date(start.getTime() + 60 * 60 * 1000);

      // Extract event noun title from original user message
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

  // Flexible notification & reminder regex pattern
  const isNotificationIntent = /(notify|remind|ping|alert|let me know|warn|tell me|wake me|heads up)/i.test(lower);
  if (isNotificationIntent) {
    let remindDate = parseTimeFromText(prompt, now);
    if (!remindDate) {
      // Default to 1 hour from now if no time or relative duration specified
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

  // Note detection
  if (lower.includes('password') || lower.includes('wifi') || lower.includes('note:') || lower.includes('remember that')) {
    let cleanTitle = 'Saved Note';
    if (lower.includes('wifi')) cleanTitle = 'WiFi Info';
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

  // Event / Appointment / Date / Game / Class detection
  const eventWordMatch = lower.match(/\b(appointment|dentist|doctor|meeting|flight|date|interview|test|party|dinner|lunch|concert|event|game|class|match|show|movie|hangout)\b/i);
  const isEventWord = !!eventWordMatch;
  if (isEventWord) {
    // Build a clean, short title from the matched event noun
    const eventNoun = eventWordMatch![1];
    const nounTitle = eventNoun.charAt(0).toUpperCase() + eventNoun.slice(1);

    if (!hasExplicitTimeOfDay(prompt)) {
      return {
        intent: 'missing_information',
        confidence: 0.95,
        title: nounTitle,
        missingFields: ['startTime'],
        question: `What time is your ${eventNoun}?`,
        reasoning: 'Detected event/date/appointment without explicit time of day',
      };
    }

    // Try explicit numeric time first
    const timeMatch = prompt.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    // Try time-of-day word (morning, afternoon, etc.)
    const todHour = timeOfDayWordToHour(prompt);

    let hour: number;
    let minute = 0;
    if (timeMatch) {
      hour = parseInt(timeMatch[1], 10);
      minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampm = timeMatch[3]?.toLowerCase();
      if (ampm === 'pm' && hour < 12) hour += 12;
      if (ampm === 'am' && hour === 12) hour = 0;
      // If no AM/PM given and hour is ambiguous (1-6), prefer the time-of-day context
      if (!ampm && hour >= 1 && hour <= 6 && todHour !== null) {
        hour = todHour < 12 ? hour : hour + 12; // morning → keep as AM; afternoon/evening → add 12
      }
    } else if (todHour !== null) {
      hour = todHour;
    } else {
      hour = 9; // safe default
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
    const reminderMinutesBefore = hasReminder ? 60 : undefined;

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

  // General Task / Scheduled Item detection (e.g. "i have something to do in 30 sec", "do X at 3pm", "buy groceries")
  const parsedTime = parseTimeFromText(prompt, now);
  const isTaskAction = /(do|have|need|got|must|should|buy|todo|clean|submit|call|go|get|prepare|finish|task)/i.test(lower);

  if (parsedTime || isTaskAction) {
    const due = parsedTime || new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const title = prompt.length > 50 ? prompt.slice(0, 47).trim() + '...' : prompt;

    // If time is short (e.g. within 10 minutes), create a reminder alert immediately
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

  // Fallback to interactive choice suggestion ONLY for ambiguous non-time phrases (e.g. "feeling tired" or "new york")
  return {
    intent: 'suggest_choices',
    confidence: 0.8,
    question: `What would you like me to do with "${prompt}"?`,
    choices: generateDefaultChoices(prompt, now),
    reasoning: 'Ambiguous statement parsed into interactive choice suggestions',
  };
}
