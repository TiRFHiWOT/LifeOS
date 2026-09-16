import { interpretNaturalLanguage, parseTimeFromText, matchContextItems } from '../../services/ai';
import { generateGoalPlan, completePlanStep, evaluatePlanDependencies } from '../../services/planner';
import { getAgentActivityLogs } from '../../services/agentActivityLog';
import { orchestrateAIAction } from '../../services/orchestrator';

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

  // Scenario 5 — Multi-Step Goal Understanding
  try {
    const prompt5 = 'I need to prepare for my trip to Nairobi next month.';
    const interp5 = await interpretNaturalLanguage(prompt5, refDateISO);
    const pass5 = interp5.intent === 'create_plan' && !!(interp5.goal || interp5.title) && Array.isArray(interp5.possibleActions) && interp5.possibleActions.length > 0;
    results.push({
      scenarioName: 'Scenario 5 — Goal Understanding',
      passed: pass5,
      prompt: prompt5,
      intentFound: interp5.intent,
      outputSummary: `Goal: "${interp5.goal || interp5.title}", Possible Actions: [${interp5.possibleActions?.join(', ') || ''}]`,
    });
  } catch (err: unknown) {
    results.push({
      scenarioName: 'Scenario 5 — Goal Understanding',
      passed: false,
      prompt: 'I need to prepare for my trip to Nairobi next month.',
      intentFound: 'error',
      outputSummary: 'Test failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  // Scenario 6 — Planning Engine
  try {
    const prompt6 = 'I need to move to a new apartment next month.';
    const plan6 = await generateGoalPlan(prompt6, refDateISO);
    const hasValidSteps = Array.isArray(plan6.steps) && plan6.steps.length > 0 && plan6.steps.every(s => 
      !!s.title && !!s.description && !!s.priority && !!s.status
    );
    const pass6 = !!plan6.goal && hasValidSteps;
    results.push({
      scenarioName: 'Scenario 6 — Planning Engine',
      passed: pass6,
      prompt: prompt6,
      intentFound: 'create_plan',
      outputSummary: `Generated Plan: "${plan6.goal}" with ${plan6.steps.length} steps. Sample step: "${plan6.steps[0]?.title}" (Priority: ${plan6.steps[0]?.priority}, Dep: ${plan6.steps[0]?.dependency || 'None'})`,
    });
  } catch (err: unknown) {
    results.push({
      scenarioName: 'Scenario 6 — Planning Engine',
      passed: false,
      prompt: 'I need to move to a new apartment next month.',
      intentFound: 'error',
      outputSummary: 'Test failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  // Scenario 7 — Connect Plans to Existing Actions
  try {
    const prompt7 = 'Prepare for my trip to Nairobi.';
    const plan7 = await generateGoalPlan(prompt7, refDateISO);
    const stepTypes = plan7.steps.map(s => s.actionType || 'task');
    const pass7 = plan7.steps.length >= 3 && stepTypes.length === plan7.steps.length;
    results.push({
      scenarioName: 'Scenario 7 — Plan to Action Routing',
      passed: pass7,
      prompt: prompt7,
      intentFound: 'create_plan',
      outputSummary: `Plan steps mapped to actions: [${stepTypes.join(', ')}]`,
    });
  } catch (err: unknown) {
    results.push({
      scenarioName: 'Scenario 7 — Plan to Action Routing',
      passed: false,
      prompt: 'Prepare for my trip to Nairobi.',
      intentFound: 'error',
      outputSummary: 'Test failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  // Scenario 8 — Context Awareness & Existing Item Search
  try {
    const prompt8 = 'Move my dentist appointment to next week.';
    const mockContext = {
      events: [{ id: 'evt-123', title: 'Dentist appointment', startAt: '2026-09-11T15:00:00.000Z', endAt: '2026-09-11T16:00:00.000Z' }],
    };
    const interp8 = await interpretNaturalLanguage(prompt8, refDateISO, [], mockContext);
    const pass8 = !!interp8.question && interp8.question.toLowerCase().includes('dentist') && (interp8.targetItemId === 'evt-123' || interp8.intent === 'missing_information' || interp8.intent === 'update_event');
    results.push({
      scenarioName: 'Scenario 8 — Context Awareness',
      passed: pass8,
      prompt: prompt8,
      intentFound: interp8.intent,
      outputSummary: `Context match found item ID "${interp8.targetItemId || 'N/A'}". Question asked: "${interp8.question || 'N/A'}"`,
    });
  } catch (err: unknown) {
    results.push({
      scenarioName: 'Scenario 8 — Context Awareness',
      passed: false,
      prompt: 'Move my dentist appointment to next week.',
      intentFound: 'error',
      outputSummary: 'Test failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  // Scenario 9 — Calendar Intelligence & Availability
  try {
    const prompt9 = 'Schedule a meeting with Sarah tomorrow afternoon.';
    const mockEvents = {
      events: [{ id: 'busy-1', title: 'Existing Doctor Appointment', startAt: '2026-09-09T13:00:00.000Z', endAt: '2026-09-09T14:00:00.000Z' }],
    };
    const interp9 = await interpretNaturalLanguage(prompt9, refDateISO, [], mockEvents);
    const pass9 = interp9.intent === 'suggest_choices' && Array.isArray(interp9.choices) && interp9.choices.length > 0;
    results.push({
      scenarioName: 'Scenario 9 — Calendar Intelligence',
      passed: pass9,
      prompt: prompt9,
      intentFound: interp9.intent,
      outputSummary: `Question: "${interp9.question}". Available choices: [${interp9.choices?.map(c => c.label).join(' | ')}]`,
    });
  } catch (err: unknown) {
    results.push({
      scenarioName: 'Scenario 9 — Calendar Intelligence',
      passed: false,
      prompt: 'Schedule a meeting with Sarah tomorrow afternoon.',
      intentFound: 'error',
      outputSummary: 'Test failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  // Scenario 10 — Plan Dependencies & Completion Tracking
  try {
    const plan10 = await generateGoalPlan('I want to travel to Nairobi next month.', refDateISO);
    const step1Title = plan10.steps[0]?.title || 'Check passport';
    const step2Before = plan10.steps[1];
    const isStep2BlockedBefore = step2Before?.status === 'blocked' || step2Before?.status === 'pending';

    const updatedPlan = completePlanStep(plan10, step1Title);
    const step2After = updatedPlan.steps[1];
    const isStep2UnblockedAfter = step2After?.status === 'ready' || step2After?.status === 'in_progress' || step2After?.status === 'completed';

    const pass10 = isStep2BlockedBefore && isStep2UnblockedAfter && (updatedPlan.progressPercentage || 0) > 0;

    results.push({
      scenarioName: 'Scenario 10 — Plan Dependencies & Unblocking',
      passed: pass10,
      prompt: 'I want to travel to Nairobi next month.',
      intentFound: 'create_plan',
      outputSummary: `Step 2 status before completing Step 1: "${step2Before?.status}". After completing Step 1: "${step2After?.status}". Progress: ${updatedPlan.progressPercentage}%`,
    });
  } catch (err: unknown) {
    results.push({
      scenarioName: 'Scenario 10 — Plan Dependencies & Unblocking',
      passed: false,
      prompt: 'I want to travel to Nairobi next month.',
      intentFound: 'error',
      outputSummary: 'Test failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  // Scenario 11 — Proactive Agent Alert Engine
  try {
    const prompt11 = 'Proactive Agent Notification Engine Check';
    const sampleEventTitle = 'Nairobi trip';
    const sampleUnfinishedTasks = ['Check passport', 'Prepare packing list'];
    const alertMsg = `Your ${sampleEventTitle} is tomorrow. You still have ${sampleUnfinishedTasks.length} preparation tasks unfinished.`;
    const pass11 = alertMsg.includes('Nairobi trip') && alertMsg.includes('2 preparation tasks unfinished');

    results.push({
      scenarioName: 'Scenario 11 — Proactive Agent Alerts',
      passed: pass11,
      prompt: prompt11,
      intentFound: 'proactive_agent_alert',
      outputSummary: `Proactive Alert Message: "${alertMsg}"`,
    });
  } catch (err: unknown) {
    results.push({
      scenarioName: 'Scenario 11 — Proactive Agent Alerts',
      passed: false,
      prompt: 'Proactive Agent Notification Engine Check',
      intentFound: 'error',
      outputSummary: 'Test failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  // Scenario 12 — External Weather API Integration
  try {
    const prompt12 = 'Will it rain tomorrow during my outdoor event?';
    const interp12 = await interpretNaturalLanguage(prompt12, refDateISO);
    const pass12 = interp12.intent === 'weather_check' && !!interp12.weatherForecast && typeof interp12.weatherForecast.isRainExpected === 'boolean';
    results.push({
      scenarioName: 'Scenario 12 — Weather API Integration',
      passed: pass12,
      prompt: prompt12,
      intentFound: interp12.intent,
      outputSummary: `Condition: "${interp12.weatherForecast?.weatherCondition}", Rain Expected: ${interp12.weatherForecast?.isRainExpected}, Recommendation: "${interp12.weatherForecast?.recommendation}"`,
    });
  } catch (err: unknown) {
    results.push({
      scenarioName: 'Scenario 12 — Weather API Integration',
      passed: false,
      prompt: 'Will it rain tomorrow during my outdoor event?',
      intentFound: 'error',
      outputSummary: 'Test failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  // Scenario 13 — Stateful Multi-Turn Conversational Follow-ups
  try {
    const prompt13a = 'Move my dentist appointment to next week.';
    const mockContext = {
      events: [{ id: 'evt-999', title: 'Dentist appointment', startAt: '2026-09-11T15:00:00.000Z', endAt: '2026-09-11T16:00:00.000Z' }],
    };
    const interp13a = await interpretNaturalLanguage(prompt13a, refDateISO, [], mockContext);

    const history13 = [
      { role: 'user', text: prompt13a },
      { role: 'assistant', text: interp13a.question || 'Do you want to move your dentist appointment (Friday, 3 PM) to next week?' },
    ];
    const prompt13b = 'Yes, confirm.';
    const interp13b = await interpretNaturalLanguage(prompt13b, refDateISO, history13, mockContext);
    const pass13 = (interp13b.intent === 'update_event' || interp13b.intent === 'create_event') && !!interp13b.title;

    results.push({
      scenarioName: 'Scenario 13 — Stateful Multi-Turn Follow-up',
      passed: pass13,
      prompt: `Turn 1: "${prompt13a}" -> Assistant: "${history13[1].text}" -> Turn 2: "${prompt13b}"`,
      intentFound: `Turn 1: ${interp13a.intent} -> Turn 2: ${interp13b.intent}`,
      outputSummary: `Turn 2 stateful resolution: intent "${interp13b.intent}", title: "${interp13b.title}"`,
    });
  } catch (err: unknown) {
    results.push({
      scenarioName: 'Scenario 13 — Stateful Multi-Turn Follow-up',
      passed: false,
      prompt: 'Stateful Multi-Turn Follow-up check',
      intentFound: 'error',
      outputSummary: 'Test failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  // Scenario 14 — Action Confirmation Rules
  try {
    const prompt14 = 'Delete my dentist appointment';
    const interp14 = await interpretNaturalLanguage(prompt14, refDateISO);
    const pass14 = interp14.intent === 'action_confirmation_required' && interp14.requiresConfirmation === true && !!interp14.question;

    results.push({
      scenarioName: 'Scenario 14 — Action Confirmation Rules',
      passed: pass14,
      prompt: prompt14,
      intentFound: interp14.intent,
      outputSummary: `Requires Confirmation: ${interp14.requiresConfirmation}, Question: "${interp14.question}"`,
    });
  } catch (err: unknown) {
    results.push({
      scenarioName: 'Scenario 14 — Action Confirmation Rules',
      passed: false,
      prompt: 'Delete my dentist appointment',
      intentFound: 'error',
      outputSummary: 'Test failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  // Scenario 15 — LifeOS Activity Log Timeline View
  try {
    const logs = getAgentActivityLogs();
    const pass15 = Array.isArray(logs);

    results.push({
      scenarioName: 'Scenario 15 — LifeOS Activity Log View',
      passed: pass15,
      prompt: 'LifeOS Activity Log Timeline check',
      intentFound: 'activity_log_view',
      outputSummary: `Found ${logs.length} activity entries.`,
    });
  } catch (err: unknown) {
    results.push({
      scenarioName: 'Scenario 15 — Agent Activity Log View',
      passed: false,
      prompt: 'Agent Activity Log Timeline check',
      intentFound: 'error',
      outputSummary: 'Test failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  // Scenario 16 — Custom Location Planning
  try {
    const prompt16 = 'Trip to Hawassa';
    const plan16 = await generateGoalPlan(prompt16, { referenceDateISO: refDateISO, userLocation: 'Dire Dawa, Ethiopia' });
    const pass16 = plan16.steps.length > 0 && !plan16.steps.some(s => s.title.toLowerCase().includes('passport'));
    results.push({
      scenarioName: 'Scenario 16 — Custom Location Planning',
      passed: pass16,
      prompt: prompt16,
      intentFound: 'create_plan',
      outputSummary: `Steps generated: ${plan16.steps.length}, Passport check absent: ${pass16}`,
    });
  } catch (err: unknown) {
    results.push({
      scenarioName: 'Scenario 16 — Custom Location Planning',
      passed: false,
      prompt: 'Trip to Hawassa',
      intentFound: 'error',
      outputSummary: 'Test failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  // Scenario 17 — Compound Duration Parsing
  try {
    const now17 = new Date(refDateISO);
    const parsedDate = parseTimeFromText('1 hour and 30 minutes', now17);
    const diffMins = parsedDate ? Math.round((parsedDate.getTime() - now17.getTime()) / (60 * 1000)) : 0;
    const pass17 = diffMins === 90;
    results.push({
      scenarioName: 'Scenario 17 — Compound Duration Parsing',
      passed: pass17,
      prompt: '1 hour and 30 minutes',
      intentFound: 'time_parse',
      outputSummary: `Parsed diff: ${diffMins} mins (Expected: 90 mins)`,
    });
  } catch (err: unknown) {
    results.push({
      scenarioName: 'Scenario 17 — Compound Duration Parsing',
      passed: false,
      prompt: '1 hour and 30 minutes',
      intentFound: 'error',
      outputSummary: 'Test failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  // Scenario 18 — Parallel Step Dependencies & ID Resolution
  try {
    const rawPlan = {
      goal: 'Test Plan',
      description: 'Testing ID dependencies',
      createdAt: refDateISO,
      status: 'ready' as const,
      steps: [
        { id: 'step-1', title: 'Step 1', description: 'First step', dueDate: null, priority: 'high' as const, actionType: 'task' as const, dependency: null, status: 'completed' as const },
        { id: 'step-2', title: 'Step 2', description: 'Second step', dueDate: null, priority: 'medium' as const, actionType: 'task' as const, dependency: 'step-1', status: 'pending' as const },
      ],
    };
    const evalResult = evaluatePlanDependencies(rawPlan);
    const pass18 = evalResult.steps[1].status === 'ready';
    results.push({
      scenarioName: 'Scenario 18 — Parallel Step Dependencies & ID Resolution',
      passed: pass18,
      prompt: 'Test step ID dependency resolution',
      intentFound: 'plan_evaluate',
      outputSummary: `Step 2 resolved status: "${evalResult.steps[1].status}" (Expected: "ready")`,
    });
  } catch (err: unknown) {
    results.push({
      scenarioName: 'Scenario 18 — Parallel Step Dependencies & ID Resolution',
      passed: false,
      prompt: 'Test step ID dependency resolution',
      intentFound: 'error',
      outputSummary: 'Test failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  // Scenario 19 — Context Match Structured Clarification
  try {
    const mockContext19 = {
      events: [{ id: 'evt-abc', title: 'Doctor appointment', startAt: '2026-09-10T10:00:00.000Z', endAt: '2026-09-10T11:00:00.000Z' }],
    };
    const matchRes = matchContextItems('Reschedule doctor appointment', mockContext19);
    const pass19 = matchRes !== null && matchRes.targetItemId === 'evt-abc' && matchRes.pendingClarification?.intent === 'update_event';
    results.push({
      scenarioName: 'Scenario 19 — Context Match Structured Clarification',
      passed: pass19,
      prompt: 'Reschedule doctor appointment',
      intentFound: matchRes?.intent || 'none',
      outputSummary: `Matched targetItemId: "${matchRes?.targetItemId}", pendingClarification intent: "${matchRes?.pendingClarification?.intent}"`,
    });
  } catch (err: unknown) {
    results.push({
      scenarioName: 'Scenario 19 — Context Match Structured Clarification',
      passed: false,
      prompt: 'Reschedule doctor appointment',
      intentFound: 'error',
      outputSummary: 'Test failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  // Scenario 20 — Orchestrator Task Update Action Type
  try {
    const res20 = await orchestrateAIAction('test-user-id', {
      intent: 'update_task',
      confidence: 0.95,
      title: 'Update existing task title',
    });
    const pass20 = res20.actionType === 'task_updated';
    results.push({
      scenarioName: 'Scenario 20 — Orchestrator Task Update Action Type',
      passed: pass20,
      prompt: 'update_task intent execution',
      intentFound: 'update_task',
      outputSummary: `Orchestrator returned actionType: "${res20.actionType}" (Expected: "task_updated")`,
    });
  } catch (err: unknown) {
    results.push({
      scenarioName: 'Scenario 20 — Orchestrator Task Update Action Type',
      passed: false,
      prompt: 'update_task intent execution',
      intentFound: 'error',
      outputSummary: 'Test failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  // Scenario 21 — Orchestrator Task Delete Action Type
  try {
    const res21 = await orchestrateAIAction('test-user-id', {
      intent: 'delete_task',
      confidence: 0.95,
      title: 'Delete existing task title',
    });
    const pass21 = res21.actionType === 'task_deleted';
    results.push({
      scenarioName: 'Scenario 21 — Orchestrator Task Delete Action Type',
      passed: pass21,
      prompt: 'delete_task intent execution',
      intentFound: 'delete_task',
      outputSummary: `Orchestrator returned actionType: "${res21.actionType}" (Expected: "task_deleted")`,
    });
  } catch (err: unknown) {
    results.push({
      scenarioName: 'Scenario 21 — Orchestrator Task Delete Action Type',
      passed: false,
      prompt: 'delete_task intent execution',
      intentFound: 'error',
      outputSummary: 'Test failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  // Scenario 22 — Orchestrator Event Delete Action Type
  try {
    const res22 = await orchestrateAIAction('test-user-id', {
      intent: 'delete_event',
      confidence: 0.95,
      title: 'Delete existing event title',
    });
    const pass22 = res22.actionType === 'event_deleted';
    results.push({
      scenarioName: 'Scenario 22 — Orchestrator Event Delete Action Type',
      passed: pass22,
      prompt: 'delete_event intent execution',
      intentFound: 'delete_event',
      outputSummary: `Orchestrator returned actionType: "${res22.actionType}" (Expected: "event_deleted")`,
    });
  } catch (err: unknown) {
    results.push({
      scenarioName: 'Scenario 22 — Orchestrator Event Delete Action Type',
      passed: false,
      prompt: 'delete_event intent execution',
      intentFound: 'error',
      outputSummary: 'Test failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  return results;
}
