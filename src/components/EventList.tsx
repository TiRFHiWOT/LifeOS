'use client';

import { EventItem } from '@/types';

interface EventListProps {
  events: EventItem[];
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
}

export default function EventList({ events, onDelete, loading }: EventListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 bg-slate-900/60 rounded-xl animate-pulse border border-slate-800"></div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl">
        <p className="text-sm text-slate-400">No scheduled events.</p>
        <p className="text-xs text-slate-500 mt-1">Ask LifeOS to schedule an event (e.g., &quot;Dentist appointment Friday at 3 PM&quot;).</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div
          key={event.id}
          className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex items-start justify-between gap-4"
        >
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mt-0.5">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-100 truncate">{event.title}</p>
                {event.calendarEventId && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    Synced to Google
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-300 font-medium mt-1">
                {new Date(event.startAt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                {' — '}
                {new Date(event.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              {event.description && (
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{event.description}</p>
              )}
            </div>
          </div>

          <button
            onClick={() => onDelete(event.id)}
            className="text-xs text-slate-500 hover:text-red-400 p-1 transition"
            title="Delete Event"
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
