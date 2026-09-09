import { interpretNaturalLanguage } from '../../services/ai';

export interface ScenarioTestResult {
  scenarioName: string;
  passed: boolean;
  prompt: string;
  intentFound: string;
  outputSummary: string;
  error?: string;
}

export async function runDemoScenarios(): Promise<ScenarioTestResult[]> {
  const refDateISO = '2026-09-08T14:00:00.000Z'; // Tuesday 2 PM
  const results: ScenarioTestResult[] = [];

  // Scenario 1 — Calendar & Reminder
  try {
    const prompt1 = 'Dentist appointment Friday at 3 PM. Remind me one hour before.';
    const interp1 = await interpretNaturalLanguage(prompt1, refDateISO);
    const pass1 = (interp1.intent === 'create_event' || interp1.intent === 'create_reminder') && !!interp1.title;
    results.push({
      scenarioName: 'Scenario 1 — Calendar & Reminder',
      passed: pass1,
      prompt: prompt1,
      intentFound: interp1.intent,
      outputSummary: `Parsed title: "${interp1.title}", startAt: ${interp1.startAt || 'N/A'}, reminderMinutesBefore: ${interp1.reminderMinutesBefore || 'N/A'}`,
    });
  } catch (err: unknown) {
    results.push({
      scenarioName: 'Scenario 1 — Calendar & Reminder',
      passed: false,
      prompt: 'Dentist appointment Friday at 3 PM. Remind me one hour before.',
      intentFound: 'error',
      outputSummary: 'Test failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  // Scenario 2 — Task
  try {
    const prompt2 = 'Buy groceries tomorrow.';
    const interp2 = await interpretNaturalLanguage(prompt2, refDateISO);
    const pass2 = interp2.intent === 'create_task' && !!interp2.title;
    results.push({
      scenarioName: 'Scenario 2 — Task',
      passed: pass2,
      prompt: prompt2,
      intentFound: interp2.intent,
      outputSummary: `Parsed title: "${interp2.title}", dueAt: ${interp2.dueAt || 'N/A'}`,
    });
  } catch (err: unknown) {
    results.push({
      scenarioName: 'Scenario 2 — Task',
      passed: false,
      prompt: 'Buy groceries tomorrow.',
      intentFound: 'error',
      outputSummary: 'Test failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  // Scenario 3 — Missing Information & Follow-Up
  try {
    const prompt3a = 'Meeting with Sarah tomorrow.';
    const interp3a = await interpretNaturalLanguage(prompt3a, refDateISO);
    const pass3a = interp3a.intent === 'missing_information';

    const prompt3b = 'At 2 PM.';
    const history3 = [
      { role: 'user', text: prompt3a },
      { role: 'assistant', text: interp3a.question || 'What time is the meeting?' },
    ];
    const interp3b = await interpretNaturalLanguage(prompt3b, refDateISO, history3);
    const pass3b = interp3b.intent === 'create_event';

    results.push({
      scenarioName: 'Scenario 3 — Missing Information & Follow-Up',
      passed: pass3a && pass3b,
      prompt: `Turn 1: "${prompt3a}" -> Turn 2: "${prompt3b}"`,
      intentFound: `Turn 1: ${interp3a.intent} -> Turn 2: ${interp3b.intent}`,
      outputSummary: `Follow-up question: "${interp3a.question}". Turn 2 merged startAt: ${interp3b.startAt || 'N/A'}`,
    });
  } catch (err: unknown) {
    results.push({
      scenarioName: 'Scenario 3 — Missing Information & Follow-Up',
      passed: false,
      prompt: 'Meeting with Sarah tomorrow.',
      intentFound: 'error',
      outputSummary: 'Test failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  // Scenario 4 — Note
  try {
    const prompt4 = 'My apartment WiFi password is XXXXX.';
    const interp4 = await interpretNaturalLanguage(prompt4, refDateISO);
    const pass4 = interp4.intent === 'create_note' && !!interp4.content;
    results.push({
      scenarioName: 'Scenario 4 — Note',
      passed: pass4,
      prompt: prompt4,
      intentFound: interp4.intent,
      outputSummary: `Parsed title: "${interp4.title}", content: "${interp4.content}"`,
    });
  } catch (err: unknown) {
    results.push({
      scenarioName: 'Scenario 4 — Note',
      passed: false,
      prompt: 'My apartment WiFi password is XXXXX.',
      intentFound: 'error',
      outputSummary: 'Test failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  return results;
}
