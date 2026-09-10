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

  const systemInstruction = `
You are the natural language understanding engine for LifeOS, a personal administrative assistant.
Analyze user inputs and map them to structured intents and parameters.

Current reference time context:
- Timestamp: ${currentDateStr}
- Day of week: ${dayOfWeek}

Possible Intents:
1. "create_event": Scheduled calendar appointment or meeting tied to a specific time/date range. Required fields: title, startAt, endAt.
2. "create_task": Action item or to-do. Optional dueAt.
3. "create_note": Personal info, passwords, reference notes, or general facts to store. Required fields: title, content.
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
    const model = 'gemini-2.5-flash';

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

  if (result.intent === 'create_event' && (!result.startAt || !result.endAt)) {
    result.intent = 'missing_information';
    result.missingFields = result.missingFields || ['startTime'];
    result.question = result.question || 'What time is the meeting or event?';
  }

  if (result.intent === 'unknown' || result.intent === 'suggest_choices') {
    result.intent = 'suggest_choices';
    result.question = result.question || `What would you like me to do with "${prompt}"?`;
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
      label: `📝 Save as Note: "${titleCap}"`,
      type: 'note',
      interpretation: {
        intent: 'create_note',
        confidence: 0.95,
        title: titleCap,
        content: prompt,
      },
    },
    {
      label: `☑️ Add Task: "Rest / Handle '${prompt}'"`,
      type: 'task',
      interpretation: {
        intent: 'create_task',
        confidence: 0.95,
        title: `Rest / Handle '${prompt}'`,
        dueAt: tomorrow.toISOString(),
      },
    },
    {
      label: `📅 Schedule Event for Tomorrow`,
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
      label: `🔔 Set Reminder in 4 hours`,
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

function heuristicFallbackParse(
  prompt: string,
  now: Date,
  conversationHistory?: { role: string; text: string }[]
): AIInterpretationResult {
  const lower = prompt.toLowerCase();

  // If there's conversation history where assistant asked for time, merge context!
  if (conversationHistory && conversationHistory.length > 0) {
    const lastHistory = conversationHistory[conversationHistory.length - 1];
    const firstUserMsg = conversationHistory.find((h) => h.role === 'user')?.text || 'Event';

    if (lastHistory.text.toLowerCase().includes('time') || lower.includes('pm') || lower.includes('am') || lower.includes('at')) {
      const start = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const hourMatch = lower.match(/(\d{1,2})/);
      const hour = hourMatch ? parseInt(hourMatch[1], 10) : 15;
      const adjustedHour = lower.includes('pm') && hour < 12 ? hour + 12 : hour;
      start.setHours(adjustedHour, 0, 0, 0);

      const end = new Date(start.getTime() + 60 * 60 * 1000);

      return {
        intent: 'create_event',
        confidence: 0.9,
        title: firstUserMsg,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        reasoning: 'Fallback heuristic: merged follow-up answer with previous conversation context',
      };
    }
  }

  // Flexible notification & reminder regex pattern
  const isNotificationIntent = /(notify|remind|ping|alert|let me know|warn|tell me|wake me|heads up)/i.test(lower);
  if (isNotificationIntent) {
    let remindDate = new Date(now);

    // Check relative minutes e.g. "in 30 minutes"
    const relMinMatch = lower.match(/in\s+(\d+)\s+min/i);
    if (relMinMatch) {
      const mins = parseInt(relMinMatch[1], 10);
      remindDate = new Date(now.getTime() + mins * 60 * 1000);
    } else {
      // Check time e.g. "4 PM" or "16:00"
      const hourMatch = lower.match(/(\d{1,2})(:\d{2})?\s*(pm|am)?/i);
      let hour = hourMatch ? parseInt(hourMatch[1], 10) : 16;
      if (lower.includes('pm') && hour < 12) hour += 12;
      if (lower.includes('am') && hour === 12) hour = 0;

      // If specified time has already passed today, set for tomorrow
      if (hour < now.getHours()) {
        remindDate.setDate(remindDate.getDate() + 1);
      }
      remindDate.setHours(hour, 0, 0, 0);
    }

    return {
      intent: 'create_reminder',
      confidence: 0.95,
      title: prompt,
      remindAt: remindDate.toISOString(),
      reasoning: 'Parsed notification/reminder intent',
    };
  }

  // Note detection
  if (lower.includes('password') || lower.includes('wifi') || lower.includes('note:') || lower.includes('remember that')) {
    return {
      intent: 'create_note',
      confidence: 0.9,
      title: prompt.split(' ')[0] + ' ' + (prompt.split(' ')[1] || 'Note'),
      content: prompt,
      reasoning: 'Fallback heuristic: detected note / information keywords',
    };
  }

  // Event detection
  if (lower.includes('appointment') || lower.includes('dentist') || lower.includes('meeting') || lower.includes('flight')) {
    const hasTime = /\b(\d{1,2}(:\d{2})?\s*(am|pm)?)\b/i.test(prompt) || lower.includes('at ');
    if (!hasTime) {
      return {
        intent: 'missing_information',
        confidence: 0.85,
        title: prompt,
        missingFields: ['startTime'],
        question: 'What time is the appointment?',
        reasoning: 'Fallback heuristic: detected meeting/event without specific time',
      };
    }

    const start = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    start.setHours(15, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const hasReminder = lower.includes('remind me');
    const reminderMinutesBefore = hasReminder ? 60 : undefined;

    return {
      intent: 'create_event',
      confidence: 0.85,
      title: prompt.split('.')[0],
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      reminderMinutesBefore,
      reasoning: 'Fallback heuristic: parsed event with time and reminder request',
    };
  }

  // Task detection
  if (lower.includes('buy') || lower.includes('todo') || lower.includes('clean') || lower.includes('submit') || lower.includes('task')) {
    const due = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return {
      intent: 'create_task',
      confidence: 0.88,
      title: prompt,
      dueAt: due.toISOString(),
      reasoning: 'Fallback heuristic: parsed to-do task',
    };
  }

  // Fallback to interactive choice suggestion for ambiguous statements!
  return {
    intent: 'suggest_choices',
    confidence: 0.8,
    question: `What would you like me to do with "${prompt}"?`,
    choices: generateDefaultChoices(prompt, now),
    reasoning: 'Ambiguous prompt parsed into interactive choice suggestions',
  };
}
