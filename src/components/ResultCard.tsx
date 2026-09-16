'use client';

import { useState } from 'react';
import { CheckCircle2, HelpCircle, Calendar, Bell, Check, FileText, CheckSquare, Sparkles, Lock, CloudRain, AlertTriangle } from 'lucide-react';
import { AIChoice } from '@/types/ai';
import { WeatherForecastResult } from '@/services/weather';

import { GoalPlan, ExecutedPlanSummary } from '@/types/plan';

export interface ActionResultData {
  actionType: string;
  success: boolean;
  message?: string;
  question?: string;
  choices?: AIChoice[];
  plan?: GoalPlan;
  executedPlan?: ExecutedPlanSummary;
  weatherForecast?: WeatherForecastResult;
  createdItem?: {
    id?: string;
    title?: string;
    description?: string;
    startAt?: string;
    endAt?: string;
    dueAt?: string;
    content?: string;
    remindAt?: string;
  };
}

interface ResultCardProps {
  result: ActionResultData;
  onClear: () => void;
  onFollowUpSubmit?: (answer: string) => Promise<void>;
  onExecuteChoice?: (interpretation: unknown) => Promise<void>;
}

export default function ResultCard({ result, onClear, onFollowUpSubmit, onExecuteChoice }: ResultCardProps) {
  const [followUpInput, setFollowUpInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpInput.trim() || !onFollowUpSubmit || submitting) return;
    setSubmitting(true);
    const text = followUpInput.trim();
    setFollowUpInput('');
    await onFollowUpSubmit(text);
    setSubmitting(false);
  };

  // Case 0: Multi-Step Goal Plan Recognized & Executed
  if (result.actionType === 'plan_created' || result.plan) {
    const plan = result.plan;
    const executed = result.executedPlan;

    return (
      <div className="w-full bg-slate-900 border border-indigo-500/40 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs tracking-wide uppercase">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            LifeOS Plan Execution
          </div>
          <button onClick={onClear} className="text-xs text-slate-500 hover:text-slate-300">
            Dismiss
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold font-mono">Goal</p>
            <p className="text-base font-bold text-slate-100 mt-0.5">{plan?.goal || result.message}</p>
            {plan?.description && <p className="text-xs text-slate-400 mt-1">{plan.description}</p>}
          </div>

          {executed && (
            <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
              {executed.counts.tasks > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5 font-semibold">
                  <CheckSquare className="w-3.5 h-3.5" /> {executed.counts.tasks} Task{executed.counts.tasks > 1 ? 's' : ''} Created
                </span>
              )}
              {executed.counts.events > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 flex items-center gap-1.5 font-semibold">
                  <Calendar className="w-3.5 h-3.5" /> {executed.counts.events} Event{executed.counts.events > 1 ? 's' : ''} Scheduled
                </span>
              )}
              {executed.counts.reminders > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-1.5 font-semibold">
                  <Bell className="w-3.5 h-3.5" /> {executed.counts.reminders} Reminder{executed.counts.reminders > 1 ? 's' : ''} Set
                </span>
              )}
              {executed.counts.notes > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 flex items-center gap-1.5 font-semibold">
                  <FileText className="w-3.5 h-3.5" /> {executed.counts.notes} Note{executed.counts.notes > 1 ? 's' : ''} Saved
                </span>
              )}
            </div>
          )}

          {plan?.steps && plan.steps.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold font-mono">Action Steps ({plan.steps.length})</p>
              <div className="space-y-2">
                {plan.steps.map((step, idx) => {
                  const priorityColor =
                    step.priority === 'high'
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                      : step.priority === 'medium'
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700';

                  return (
                    <div key={idx} className="bg-slate-950/70 p-3 rounded-xl border border-white/5 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center text-xs font-mono shrink-0">
                            {idx + 1}
                          </span>
                          <p className="text-xs font-semibold text-slate-100">{step.title}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono uppercase ${priorityColor}`}>
                          {step.priority}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 pl-7">{step.description}</p>
                      <div className="flex flex-wrap items-center gap-2 pl-7 pt-1 text-[10px] font-mono">
                        {step.dependency && (
                          <span className="bg-indigo-950/60 border border-indigo-500/30 px-2 py-0.5 rounded text-indigo-300">
                            Depends on: {step.dependency}
                          </span>
                        )}
                        {step.dueDate && (
                          <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-amber-300">
                            Due: {new Date(step.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        {step.status === 'blocked' ? (
                          <span className="bg-rose-950/60 border border-rose-500/40 text-rose-300 px-2 py-0.5 rounded flex items-center gap-1 font-semibold uppercase">
                            <Lock className="w-3 h-3 text-rose-400 shrink-0" /> Blocked
                          </span>
                        ) : step.status === 'completed' ? (
                          <span className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded flex items-center gap-1 font-semibold uppercase">
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" /> Completed
                          </span>
                        ) : (
                          <span className="bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase">
                            {step.status}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClear}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Got it</span>
          </button>
        </div>
      </div>
    );
  }

  // Case Weather Forecast Card (External Information Agent API)
  if (result.actionType === 'weather_checked' || result.weatherForecast) {
    const forecast = result.weatherForecast;
    return (
      <div className="w-full bg-slate-900 border border-sky-500/40 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs tracking-wide uppercase">
            <CloudRain className="w-4 h-4 text-sky-400 animate-pulse" />
            LifeOS External Information — Weather Intelligence
          </div>
          <button onClick={onClear} className="text-xs text-slate-500 hover:text-slate-300">
            Dismiss
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-100">{forecast?.location || 'Local Weather'}</p>
            <span
              className={`text-xs px-2.5 py-1 rounded-full border font-mono ${
                forecast?.isRainExpected ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              {forecast?.weatherCondition || 'Forecast Available'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-white/5">
            <div>High: <span className="font-bold text-slate-100">{forecast?.temperatureMax ?? '--'}°C</span></div>
            <div>Low: <span className="font-bold text-slate-100">{forecast?.temperatureMin ?? '--'}°C</span></div>
            <div>Rain Chance: <span className="font-bold text-sky-300">{forecast?.precipitationProbability ?? 0}%</span></div>
          </div>

          {forecast?.recommendation && (
            <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-500/30 text-xs text-sky-200 leading-relaxed font-medium">
              💡 <span className="font-semibold">LifeOS Advice:</span> {forecast.recommendation}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClear}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Got it</span>
          </button>
        </div>
      </div>
    );
  }

  // Case Action Confirmation Required (Destructive / Sensitive Action Rules)
  if (result.actionType === 'confirmation_required') {
    return (
      <div className="w-full bg-rose-950/40 border border-rose-500/40 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs tracking-wide uppercase">
            <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
            Action Confirmation Required
          </div>
          <button onClick={onClear} className="text-xs text-slate-500 hover:text-slate-300">
            Dismiss
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-base font-bold text-slate-100">
            {result.question || 'Are you sure you want to execute this action?'}
          </p>
          <p className="text-xs text-rose-300/90 leading-relaxed font-mono bg-rose-950/60 p-3 rounded-xl border border-rose-500/20">
            ⚠️ {result.message || 'This is a high-impact operation that will alter or delete your data.'}
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-rose-900/40">
          <button
            onClick={onClear}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              if (onFollowUpSubmit) {
                await onFollowUpSubmit('Yes, confirm.');
              } else {
                onClear();
              }
            }}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4 text-white" />
            <span>Confirm Action</span>
          </button>
        </div>
      </div>
    );
  }

  // Case 1: Interactive Choices Suggested (e.g. for "I am sick today")
  if (result.actionType === 'choices_suggested' || (result.choices && result.choices.length > 0)) {
    return (
      <div className="w-full bg-slate-900 border border-indigo-500/40 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs tracking-wide uppercase">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            Assistant Suggestions
          </div>
          <button onClick={onClear} className="text-xs text-slate-500 hover:text-slate-300">
            Dismiss
          </button>
        </div>

        <p className="text-sm font-medium text-slate-100">
          {result.question || result.message || 'How would you like me to handle this?'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {result.choices?.map((choice, index) => {
            const Icon =
              choice.type === 'task'
                ? CheckSquare
                : choice.type === 'event'
                ? Calendar
                : choice.type === 'reminder'
                ? Bell
                : FileText;

            const badgeColor =
              choice.type === 'task'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                : choice.type === 'event'
                ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20'
                : choice.type === 'reminder'
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                : 'border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20';

            const cleanLabel = choice.label.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}]\s*/u, '');

            return (
              <button
                key={index}
                onClick={async () => {
                  if (onExecuteChoice) {
                    await onExecuteChoice(choice.interpretation);
                  }
                }}
                className={`p-3.5 rounded-xl border ${badgeColor} text-left transition flex items-center gap-3 group cursor-pointer shadow-sm`}
              >
                <div className="p-2 rounded-lg bg-slate-950/60 border border-white/10 shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate text-slate-100">{cleanLabel}</p>
                  <p className="text-[10px] opacity-75 uppercase tracking-wider font-mono mt-0.5">{choice.type}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Case 2: Missing Information Question or Confirmation Question
  if (result.actionType === 'missing_information' || result.question) {
    const questionText = result.question || result.message || 'What time is the meeting?';
    const isYesNoQuestion = /^(do you|would you|should i|are you|can i)\b/i.test(questionText.trim()) ||
      questionText.toLowerCase().includes('do you want to') ||
      questionText.toLowerCase().includes('would you like to');

    return (
      <div className="w-full bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs tracking-wide uppercase">
          <HelpCircle className="w-4 h-4 animate-pulse text-indigo-400" />
          Assistant Question
        </div>
        <p className="text-base font-semibold text-slate-100">
          {questionText}
        </p>

        {isYesNoQuestion ? (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClear}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 text-xs font-semibold transition cursor-pointer"
            >
              No, Keep Original
            </button>
            <button
              type="button"
              onClick={async () => {
                if (onFollowUpSubmit) {
                  await onFollowUpSubmit('Yes, confirm.');
                } else {
                  onClear();
                }
              }}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 text-white" />
              <span>Yes, Move Item</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleFollowUp} className="space-y-3 pt-1">
            <input
              type="text"
              value={followUpInput}
              onChange={(e) => setFollowUpInput(e.target.value)}
              disabled={submitting}
              placeholder="e.g. 10:00 AM"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-indigo-500/40 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-400"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClear}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !followUpInput.trim()}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{submitting ? 'Updating...' : 'Continue'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  // Case 3: Confident Event/Appointment Action
  if (result.actionType === 'event_created' || (result.success && result.actionType === 'create_event')) {
    const item = result.createdItem;
    const startDate = item?.startAt ? new Date(item.startAt) : null;
    const formattedDate = startDate ? startDate.toLocaleDateString(undefined, { weekday: 'long' }) : 'Upcoming';
    const formattedTime = startDate ? startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    return (
      <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Appointment set
          </div>
        </div>

        <div className="space-y-2 pt-1 border-t border-slate-800/80">
          <p className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            {item?.title || 'Appointment'}
          </p>
          <div className="text-sm text-slate-300">
            <p className="font-semibold text-indigo-300">{formattedDate}</p>
            {formattedTime && <p className="text-slate-400">{formattedTime}</p>}
          </div>
          {item?.remindAt && (
            <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 font-medium">
              <Bell className="w-3.5 h-3.5" />
              <span>Reminder set</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/80">
          <button
            onClick={onClear}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Done</span>
          </button>
        </div>
      </div>
    );
  }

  // Case 4: Successful Task
  if (result.actionType === 'task_created' || (result.success && result.actionType === 'create_task')) {
    const item = result.createdItem;
    const dueDate = item?.dueAt ? new Date(item.dueAt).toLocaleDateString(undefined, { weekday: 'long' }) : null;

    return (
      <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          Task added
        </div>

        <div className="space-y-1 pt-1 border-t border-slate-800/80">
          <p className="text-base font-bold text-slate-100 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            {item?.title || 'Task'}
          </p>
          {dueDate && <p className="text-xs text-slate-400">{dueDate}</p>}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800/80">
          <button
            onClick={onClear}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Done</span>
          </button>
        </div>
      </div>
    );
  }

  // Case 5: Note Saved
  if (result.actionType === 'note_created' || (result.success && result.actionType === 'create_note')) {
    const item = result.createdItem;

    return (
      <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          Note saved
        </div>

        <div className="space-y-1 pt-1 border-t border-slate-800/80">
          <p className="text-base font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            {item?.title || 'Note'}
          </p>
          {item?.content && (
            <p className="text-xs text-slate-300 font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800 line-clamp-3">
              {item.content}
            </p>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800/80">
          <button
            onClick={onClear}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Done</span>
          </button>
        </div>
      </div>
    );
  }

  // Generic Error or Fallback Card
  return (
    <div className={`w-full p-4 rounded-2xl border ${result.success ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : 'bg-red-950/30 border-red-500/30 text-red-300'} flex items-center justify-between`}>
      <p className="text-xs font-medium">{result.message || 'Action processed.'}</p>
      <button onClick={onClear} className="text-xs px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
        Dismiss
      </button>
    </div>
  );
}
