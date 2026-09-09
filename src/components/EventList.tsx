'use client';

import { EventItem } from '@/types';
import { Calendar, Trash2, Clock } from 'lucide-react';

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
          <div key={i} className="h-24 glass-panel rounded-xl animate-pulse border border-white/5"></div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-8 text-center glass-panel rounded-2xl border border-white/5">
        <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Calendar className="w-5 h-5 text-indigo-400" />
        </div>
        <p className="text-sm font-medium text-slate-300">No scheduled events</p>
        <p className="text-xs text-slate-500 mt-1">Ask LifeOS to schedule an event (e.g. &quot;Dentist appointment Friday at 3 PM&quot;).</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div
          key={event.id}
          className="p-4 sm:p-5 rounded-xl glass-panel glass-panel-hover border border-white/10 hover:border-indigo-500/30 transition-all duration-200 flex items-start justify-between gap-4"
        >
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
              <Calendar className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm sm:text-base font-semibold text-slate-100 truncate">{event.title}</p>
                {event.calendarEventId && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                    Google Calendar
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  {new Date(event.startAt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {' — '}
                  {new Date(event.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {event.description && (
                <p className="text-xs text-slate-400 mt-2 line-clamp-2">{event.description}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onDelete(event.id)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            title="Delete Event"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
