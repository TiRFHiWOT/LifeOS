'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Check, X, Clock } from 'lucide-react';

interface ReminderAlertItem {
  id: string;
  remind_at: string;
  tasks?: { id: string; title: string; description?: string } | { id: string; title: string; description?: string }[];
  events?: { id: string; title: string; description?: string } | { id: string; title: string; description?: string }[];
}

function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.4);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.7);
  } catch {
    // Ignore audio context autoplay errors
  }
}

const getDismissedFromStorage = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = sessionStorage.getItem('lifeos_dismissed_reminders');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

const saveDismissedToStorage = (id: string) => {
  if (typeof window === 'undefined') return;
  try {
    const current = getDismissedFromStorage();
    current.add(id);
    sessionStorage.setItem('lifeos_dismissed_reminders', JSON.stringify(Array.from(current)));
  } catch {
    // ignore storage errors
  }
};

export default function ReminderAlertListener() {
  const [activeAlerts, setActiveAlerts] = useState<ReminderAlertItem[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => getDismissedFromStorage());

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  const checkReminders = useCallback(async () => {
    try {
      const res = await fetch('/api/reminders/check');
      if (!res.ok) return;

      const data = await res.json();
      if (!data.dueReminders || !Array.isArray(data.dueReminders)) return;

      const currentDismissed = getDismissedFromStorage();
      const newAlerts: ReminderAlertItem[] = [];

      for (const item of data.dueReminders) {
        if (!currentDismissed.has(item.id) && !dismissedIds.has(item.id)) {
          newAlerts.push(item);
        }
      }

      if (newAlerts.length > 0) {
        setActiveAlerts(newAlerts);

        const hasUnseenAlerts = newAlerts.some((a) => !activeAlerts.some((existing) => existing.id === a.id));

        if (hasUnseenAlerts) {
          playNotificationChime();

          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            newAlerts.forEach((alertItem) => {
              const taskObj = Array.isArray(alertItem.tasks) ? alertItem.tasks[0] : alertItem.tasks;
              const eventObj = Array.isArray(alertItem.events) ? alertItem.events[0] : alertItem.events;

              let title = taskObj?.title || eventObj?.title || '';
              const desc = taskObj?.description || eventObj?.description || '';

              if (!title || ['reminder', 'reminder alert', 'scheduled item'].includes(title.toLowerCase())) {
                title = desc || 'Scheduled Reminder';
              }

              new Notification(`⏰ LifeOS Reminder: ${title}`, {
                body: desc || 'Your scheduled reminder is due now!',
              });
            });
          }
        }
      } else {
        setActiveAlerts([]);
      }
    } catch {
      // Ignore background check errors
    }
  }, [activeAlerts, dismissedIds]);

  useEffect(() => {
    checkReminders();
    const interval = setInterval(checkReminders, 15000);
    return () => clearInterval(interval);
  }, [checkReminders]);

  const handleDismiss = async (id: string) => {
    saveDismissedToStorage(id);
    setDismissedIds((prev) => new Set(prev).add(id));
    setActiveAlerts((prev) => prev.filter((a) => a.id !== id));

    try {
      await fetch('/api/reminders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'sent' }),
      });
    } catch {
      // Ignore network errors
    }
  };

  const handleMarkComplete = async (reminder: ReminderAlertItem) => {
    const taskObj = Array.isArray(reminder.tasks) ? reminder.tasks[0] : reminder.tasks;
    if (taskObj?.id) {
      try {
        await fetch('/api/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: taskObj.id, completed: true }),
        });
      } catch {
        // Ignore network errors
      }
    }
    await handleDismiss(reminder.id);
  };

  if (activeAlerts.length === 0) return null;

  return (
    <div className="fixed top-16 right-5 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {activeAlerts.map((reminder) => {
        const taskObj = Array.isArray(reminder.tasks) ? reminder.tasks[0] : reminder.tasks;
        const eventObj = Array.isArray(reminder.events) ? reminder.events[0] : reminder.events;

        let rawTitle = taskObj?.title || eventObj?.title || '';
        let rawDesc = taskObj?.description || eventObj?.description || '';

        const isGenericTitle = !rawTitle || ['reminder', 'reminder alert', 'scheduled item', 'task'].includes(rawTitle.trim().toLowerCase());

        let displayTitle = isGenericTitle ? (rawDesc || 'Scheduled Reminder') : rawTitle;
        let displayDesc = isGenericTitle && rawDesc ? '' : rawDesc;

        return (
          <div
            key={reminder.id}
            className="pointer-events-auto bg-slate-950/95 backdrop-blur-2xl border border-amber-500/50 rounded-2xl p-4 shadow-2xl shadow-slate-950/90 flex flex-col gap-3 animate-in slide-in-from-top-5 duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500"></div>

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0 animate-bounce">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Reminder Due Now
                  </span>
                  <h4 className="text-sm font-bold text-slate-100 truncate mt-0.5">{displayTitle}</h4>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDismiss(reminder.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {displayDesc && <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-2">{displayDesc}</p>}

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/10">
              {taskObj?.id && (
                <button
                  type="button"
                  onClick={() => handleMarkComplete(reminder)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition-all text-xs font-semibold flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  Mark Complete
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDismiss(reminder.id)}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-xs font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
