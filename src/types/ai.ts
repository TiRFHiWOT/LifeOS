import { WeatherForecastResult } from '@/services/weather';

export type AIIntent =
  | 'create_task'
  | 'create_note'
  | 'create_event'
  | 'create_reminder'
  | 'suggest_choices'
  | 'missing_information'
  | 'create_plan'
  | 'update_event'
  | 'update_task'
  | 'delete_event'
  | 'delete_task'
  | 'action_confirmation_required'
  | 'weather_check'
  | 'unknown';

export interface AIChoice {
  label: string;
  type: 'task' | 'note' | 'event' | 'reminder' | 'plan';
  interpretation: AIInterpretationResult;
}

export interface UserContextSummary {
  tasks?: Array<{ id: string; title: string; dueAt?: string | null; completed?: boolean }>;
  events?: Array<{ id: string; title: string; startAt: string; endAt: string }>;
  notes?: Array<{ id: string; title: string; content?: string }>;
  reminders?: Array<{ id: string; title?: string; remindAt: string }>;
  timeZone?: string;
  userLocation?: string;
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
  goal?: string;
  possibleActions?: string[];
  targetItemId?: string;
  targetItemType?: 'event' | 'task' | 'note' | 'reminder';
  existingItemSummary?: string;
  weatherForecast?: WeatherForecastResult;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  pendingAction?: AIInterpretationResult;
  pendingClarification?: {
    intent: AIIntent;
    targetItemId?: string;
    targetItemType?: 'event' | 'task' | 'note' | 'reminder';
    field?: string;
    startAt?: string;
    endAt?: string;
    dueAt?: string;
  };
}
