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
          <div key={i} className="h-16 glass-panel rounded-xl animate-pulse border border-white/5"></div>
        ))}
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <div className="p-8 text-center glass-panel rounded-2xl border border-white/5">
        <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-300">No active reminder alerts</p>
        <p className="text-xs text-slate-500 mt-1">Reminders are created automatically when scheduling events or tasks with alerts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {reminders.map((reminder) => (
        <div
          key={reminder.id}
          className="p-4 rounded-xl glass-panel glass-panel-hover border border-white/10 hover:border-amber-500/30 transition-all duration-200 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
                Alert set for {new Date(reminder.remindAt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium uppercase border flex items-center gap-1 ${
                    reminder.status === 'sent'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : reminder.status === 'failed'
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}
                >
                  <span className={`w-1 h-1 rounded-full ${
                    reminder.status === 'sent' ? 'bg-emerald-400' : reminder.status === 'failed' ? 'bg-red-400' : 'bg-amber-400'
                  }`}></span>
                  {reminder.status}
                </span>
                {reminder.taskId && <span className="text-[10px] text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.08]">Linked Task</span>}
                {reminder.eventId && <span className="text-[10px] text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.08]">Linked Event</span>}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onDelete(reminder.id)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            title="Delete Reminder"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
