'use client';

import { ReminderItem } from '@/types';
import { Bell, Trash2 } from 'lucide-react';

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
          <Bell className="w-5 h-5 text-amber-400" />
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
              <Bell className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-slate-100 truncate">
                {reminder.title || 'Scheduled Reminder'}
              </h4>
              {reminder.description && (
                <p className="text-xs text-slate-400 truncate mt-0.5">{reminder.description}</p>
              )}
              <p className="text-xs font-medium text-amber-400 mt-1">
                Alert set for {new Date(reminder.remindAt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
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
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
