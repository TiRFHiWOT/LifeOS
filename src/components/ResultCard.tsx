'use client';

import { useState } from 'react';
import { CheckCircle2, HelpCircle, Calendar, Bell, Check, FileText, CheckSquare, Sparkles } from 'lucide-react';

export interface ActionResultData {
  actionType: string;
  success: boolean;
  message?: string;
  question?: string;
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
}

export default function ResultCard({ result, onClear, onFollowUpSubmit }: ResultCardProps) {
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

  // Case 1: Missing Information Question
  if (result.actionType === 'missing_information' || result.question) {
    return (
      <div className="w-full bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs tracking-wide uppercase">
          <HelpCircle className="w-4 h-4 animate-pulse text-indigo-400" />
          Assistant Question
        </div>
        <p className="text-base font-semibold text-slate-100">
          {result.question || result.message || 'What time is the meeting?'}
        </p>
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
      </div>
    );
  }

  // Case 2: Confident Event/Appointment Action
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

  // Case 3: Successful Task
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

  // Case 4: Note Saved
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
