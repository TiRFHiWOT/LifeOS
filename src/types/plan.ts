export type PlanStepPriority = 'high' | 'medium' | 'low';
export type PlanStepStatus = 'pending' | 'ready' | 'in_progress' | 'blocked' | 'completed';
export type PlanStepActionType = 'task' | 'event' | 'reminder' | 'note';

export interface PlanStep {
  id?: string;
  title: string;
  description: string;
  dueDate?: string | null;
  priority: PlanStepPriority;
  dependency?: string | null;
  status: PlanStepStatus;
  actionType?: PlanStepActionType;
}

export interface GoalPlan {
  id?: string;
  goal: string;
  description?: string;
  steps: PlanStep[];
  createdAt?: string;
  status?: 'draft' | 'ready' | 'in_progress' | 'blocked' | 'completed';
  progressPercentage?: number;
}

export interface ExecutedStep {
  stepTitle: string;
  actionType: PlanStepActionType;
  entityId?: string;
  reminderId?: string;
  summary: string;
}

export interface ExecutedPlanSummary {
  goal: string;
  totalSteps: number;
  executedSteps: ExecutedStep[];
  counts: {
    tasks: number;
    events: number;
    reminders: number;
    notes: number;
  };
}
