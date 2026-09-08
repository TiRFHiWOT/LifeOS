'use client';

import { ReminderItem } from '@/types';

interface ReminderListProps {
  reminders: ReminderItem[];
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
}

export default function ReminderList({ reminders, onDelete, loading }: ReminderListProps) {
  if (loading) {
    return (
      <div className="space-y-2.5">
        {[1, 2].map((i) => (
          <div key={i} className="h-14 bg-slate-900/60 rounded-xl animate-pulse border border-slate-800"></div>
        ))}
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl">
        <p className="text-sm text-slate-400">No active reminder alerts.</p>
        <p className="text-xs text-slate-500 mt-1">Reminders are created automatically when scheduling events or tasks with alerts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {reminders.map((reminder) => (
        <div
          key={reminder.id}
          className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">
                Alert set for {new Date(reminder.remindAt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                    reminder.status === 'sent'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : reminder.status === 'failed'
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}
                >
                  {reminder.status.toUpperCase()}
                </span>
                {reminder.taskId && <span className="text-[10px] text-slate-500">Linked to Task</span>}
                {reminder.eventId && <span className="text-[10px] text-slate-500">Linked to Event</span>}
              </div>
            </div>
          </div>

          <button
            onClick={() => onDelete(reminder.id)}
            className="text-xs text-slate-500 hover:text-red-400 p-1 transition"
            title="Delete Reminder"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
