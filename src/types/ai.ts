export type AIIntent =
  | 'create_task'
  | 'create_note'
  | 'create_event'
  | 'create_reminder'
  | 'suggest_choices'
  | 'missing_information'
  | 'unknown';

export interface AIChoice {
  label: string;
  type: 'task' | 'note' | 'event' | 'reminder';
  interpretation: AIInterpretationResult;
}

export interface AIInterpretationResult {
  intent: AIIntent;
  confidence: number;
  title?: string;
  description?: string;
  content?: string;
  startAt?: string;
  endAt?: string;
  dueAt?: string;
  remindAt?: string;
  reminderMinutesBefore?: number;
  missingFields?: string[];
  question?: string;
  reasoning?: string;
  choices?: AIChoice[];
}
