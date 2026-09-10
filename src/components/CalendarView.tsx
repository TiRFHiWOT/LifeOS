'use client';

import { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Trash2, 
  CalendarDays,
  List
} from 'lucide-react';

interface CalendarDisplayItem {
  id: string;
  title: string;
  description?: string | null;
  start_at: string;
  end_at: string;
  type: 'event' | 'task';
  completed?: boolean;
  calendar_event_id?: string | null;
}

export default function CalendarView() {
  const [items, setItems] = useState<CalendarDisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const [eventsRes, tasksRes] = await Promise.all([
        fetch('/api/events').then((r) => r.json()),
        fetch('/api/tasks').then((r) => r.json()),
      ]);

      const formattedEvents: CalendarDisplayItem[] = (eventsRes.events || []).map((e: { id: string; title: string; description?: string; start_at: string; end_at: string; calendar_event_id?: string }) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        start_at: e.start_at,
        end_at: e.end_at,
        type: 'event',
        calendar_event_id: e.calendar_event_id,
      }));

      const formattedTasks: CalendarDisplayItem[] = (tasksRes.tasks || [])
        .filter((t: { due_at?: string }) => Boolean(t.due_at))
        .map((t: { id: string; title: string; description?: string; due_at: string; completed?: boolean }) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          start_at: t.due_at,
          end_at: t.due_at,
          type: 'task',
          completed: t.completed,
        }));

      setItems([...formattedEvents, ...formattedTasks]);
    } catch (err) {
      console.error('Failed to fetch calendar items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const handleDelete = async (id: string, type: 'event' | 'task') => {
    setDeletingId(id);
    try {
      const endpoint = type === 'event' ? `/api/events?id=${id}` : `/api/tasks?id=${id}`;
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete calendar item:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Month navigation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startingDayIndex = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Helper to check if two dates are the same calendar day
  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  // Filter items for a specific day
  const getItemsForDay = (date: Date) => {
    return items.filter((e) => {
      const eventStart = new Date(e.start_at);
      return isSameDay(eventStart, date);
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const selectedDayItems = getItemsForDay(selectedDate);
  const today = new Date();

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-indigo-400" />
            Calendar
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your schedule, appointments, tasks, and synchronized Google Calendar events.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 flex items-center gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Month</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Agenda</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid Section */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            {/* Month & Navigation Header */}
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                {monthNames[month]} {year}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={goToToday}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
                >
                  Today
                </button>
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-medium text-xs text-slate-400 py-2 border-b border-slate-800/80">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Month Day Cells Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Blank empty cells before starting day */}
              {Array.from({ length: startingDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="h-14 sm:h-20 rounded-xl bg-slate-950/20 border border-transparent"></div>
              ))}

              {/* Days in Month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const cellDate = new Date(year, month, dayNum);
                const isSelected = isSameDay(cellDate, selectedDate);
                const isCurrentToday = isSameDay(cellDate, today);
                const dayItems = getItemsForDay(cellDate);

                return (
                  <button
                    key={`day-${dayNum}`}
                    onClick={() => setSelectedDate(cellDate)}
                    className={`h-14 sm:h-20 p-1.5 rounded-xl border flex flex-col justify-between transition-all text-left relative ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                        : isCurrentToday
                        ? 'bg-slate-800/60 border-slate-700 text-indigo-400 font-bold'
                        : 'bg-slate-950/40 hover:bg-slate-800/40 border-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs ${isCurrentToday ? 'w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]' : ''}`}>
                        {dayNum}
                      </span>
                      {dayItems.length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      )}
                    </div>

                    {/* Event Preview Pills */}
                    <div className="hidden sm:block space-y-1 w-full overflow-hidden">
                      {dayItems.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          className={`truncate text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                            ev.type === 'task'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                          }`}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dayItems.length > 2 && (
                        <div className="text-[9px] text-slate-400 font-medium px-1">
                          +{dayItems.length - 2} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Agenda Sidebar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {selectedDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedDayItems.length} {selectedDayItems.length === 1 ? 'item' : 'items'} scheduled
                  </p>
                </div>
              </div>

              {/* Selected Day Items List */}
              <div className="mt-4 space-y-3">
                {loading ? (
                  <div className="py-8 text-center text-xs text-slate-500">Loading schedule...</div>
                ) : selectedDayItems.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 space-y-2">
                    <CalendarIcon className="w-8 h-8 mx-auto text-slate-600 stroke-[1.5]" />
                    <p className="text-xs">No items scheduled on this date.</p>
                  </div>
                ) : (
                  selectedDayItems.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition flex items-start justify-between gap-3 group"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase border ${
                              ev.type === 'task'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                            }`}
                          >
                            {ev.type}
                          </span>
                          <h4 className={`text-xs font-semibold truncate ${ev.completed ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                            {ev.title}
                          </h4>
                        </div>
                        {ev.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2">{ev.description}</p>
                        )}
                        <div className="flex items-center gap-1.5 text-[10px] text-indigo-400 font-medium pt-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(ev.start_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {ev.type === 'event' && (
                              <>
                                {' - '}
                                {new Date(ev.end_at).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(ev.id, ev.type)}
                        disabled={deletingId === ev.id}
                        className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition p-1"
                        title="Delete item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Agenda List View */
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-semibold text-slate-300">All Scheduled Appointments & Tasks</h2>
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading calendar...</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <CalendarIcon className="w-8 h-8 mx-auto text-slate-600 stroke-[1.5]" />
              <p className="text-xs">No upcoming items recorded.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((ev) => (
                <div
                  key={ev.id}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase border ${
                          ev.type === 'task'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        }`}
                      >
                        {ev.type}
                      </span>
                      <h4 className={`text-sm font-semibold truncate ${ev.completed ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                        {ev.title}
                      </h4>
                    </div>
                    {ev.description && <p className="text-xs text-slate-400 line-clamp-2">{ev.description}</p>}
                    <div className="flex items-center gap-2 text-xs text-indigo-400 pt-1 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {new Date(ev.start_at).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        •{' '}
                        {new Date(ev.start_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(ev.id, ev.type)}
                    disabled={deletingId === ev.id}
                    className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
