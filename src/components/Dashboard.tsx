'use client';

import { useState, useEffect, useCallback } from 'react';
import AIInput from '@/components/AIInput';
import TaskList from '@/components/TaskList';
import EventList from '@/components/EventList';
import NoteList from '@/components/NoteList';
import ReminderList from '@/components/ReminderList';
import QuickCreateModal from '@/components/QuickCreateModal';
import { TaskItem, EventItem, NoteItem, ReminderItem } from '@/types';
import { Database } from '@/types/database';

type TabType = 'today' | 'upcoming' | 'tasks' | 'events' | 'notes' | 'reminders';

type TaskRow = Database['public']['Tables']['tasks']['Row'];
type EventRow = Database['public']['Tables']['events']['Row'];
type NoteRow = Database['public']['Tables']['notes']['Row'];
type ReminderRow = Database['public']['Tables']['reminders']['Row'];

interface ConversationMessage {
  role: 'user' | 'assistant';
  text: string;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'question'; message: string; question?: string } | null>(null);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, eventsRes, notesRes, remindersRes] = await Promise.all([
        fetch('/api/tasks').then((r) => r.json()),
        fetch('/api/events').then((r) => r.json()),
        fetch('/api/notes').then((r) => r.json()),
        fetch('/api/reminders').then((r) => r.json()),
      ]);

      if (tasksRes.tasks) {
        setTasks(tasksRes.tasks.map((t: TaskRow) => ({
          id: t.id,
          userId: t.user_id,
          title: t.title,
          description: t.description || undefined,
          dueAt: t.due_at || undefined,
          completed: t.completed,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        })));
      }

      if (eventsRes.events) {
        setEvents(eventsRes.events.map((e: EventRow) => ({
          id: e.id,
          userId: e.user_id,
          title: e.title,
          description: e.description || undefined,
          startAt: e.start_at,
          endAt: e.end_at,
          calendarEventId: e.calendar_event_id || undefined,
          createdAt: e.created_at,
          updatedAt: e.updated_at,
        })));
      }

      if (notesRes.notes) {
        setNotes(notesRes.notes.map((n: NoteRow) => ({
          id: n.id,
          userId: n.user_id,
          title: n.title,
          content: n.content,
          createdAt: n.created_at,
          updatedAt: n.updated_at,
        })));
      }

      if (remindersRes.reminders) {
        setReminders(remindersRes.reminders.map((r: ReminderRow) => ({
          id: r.id,
          userId: r.user_id,
          taskId: r.task_id || undefined,
          eventId: r.event_id || undefined,
          remindAt: r.remind_at,
          status: r.status,
          createdAt: r.created_at,
        })));
      }
    } catch (err: unknown) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!ignore) {
        await fetchAllData();
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [fetchAllData]);

  const handleAISubmit = async (prompt: string) => {
    setAiLoading(true);
    setFeedback(null);
    try {
      const updatedHistory: ConversationMessage[] = [...conversationHistory, { role: 'user', text: prompt }];

      const response = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          referenceDateISO: new Date().toISOString(),
          conversationHistory: updatedHistory,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI request failed');

      const action = data.actionResult;
      if (action.actionType === 'missing_information') {
        const questionText = action.question || 'Could you provide more details?';
        setFeedback({
          type: 'question',
          message: 'More information needed',
          question: questionText,
        });
        setConversationHistory([...updatedHistory, { role: 'assistant', text: questionText }]);
      } else if (action.success) {
        setFeedback({
          type: 'success',
          message: action.message || 'Action executed successfully.',
        });
        setConversationHistory([]);

        if (action.actionType === 'task_created') {
          setActiveTab('tasks');
        } else if (action.actionType === 'event_created') {
          setActiveTab('events');
        } else if (action.actionType === 'note_created') {
          setActiveTab('notes');
        } else if (action.actionType === 'reminder_created') {
          setActiveTab('reminders');
        }

        await fetchAllData();
      } else {
        setFeedback({
          type: 'error',
          message: action.message || 'Could not understand request.',
        });
        setConversationHistory([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error processing AI prompt';
      setFeedback({ type: 'error', message: msg });
      setConversationHistory([]);
    } finally {
      setAiLoading(false);
    }
  };

  const clearConversation = () => {
    setConversationHistory([]);
    setFeedback(null);
  };

  const handleToggleTask = async (id: string, completed: boolean) => {
    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed }),
      });
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed } : t)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await fetch(`/api/events?id=${id}`, { method: 'DELETE' });
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      await fetch(`/api/reminders?id=${id}`, { method: 'DELETE' });
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  // Filter Search
  const query = searchQuery.toLowerCase().trim();
  const filteredTasks = tasks.filter((t) => t.title.toLowerCase().includes(query) || (t.description && t.description.toLowerCase().includes(query)));
  const filteredNotes = notes.filter((n) => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query));
  const filteredEvents = events.filter((e) => e.title.toLowerCase().includes(query) || (e.description && e.description.toLowerCase().includes(query)));

  const todayTasks = filteredTasks.filter((t) => !t.completed && (!t.dueAt || new Date(t.dueAt) <= todayEnd));
  const todayEvents = filteredEvents.filter((e) => new Date(e.startAt) <= todayEnd);

  const nextWeekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingTasks = filteredTasks.filter((t) => !t.completed && t.dueAt && new Date(t.dueAt) > todayEnd && new Date(t.dueAt) <= nextWeekEnd);
  const upcomingEvents = filteredEvents.filter((e) => new Date(e.startAt) > todayEnd && new Date(e.startAt) <= nextWeekEnd);

  return (
    <div className="max-w-5xl w-full mx-auto px-4 py-6 space-y-6">
      {/* Summary KPI Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Events Today</p>
            <p className="text-2xl font-bold text-slate-100 mt-0.5">{todayEvents.length}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            📅
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Pending Tasks</p>
            <p className="text-2xl font-bold text-slate-100 mt-0.5">{tasks.filter((t) => !t.completed).length}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ✅
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Saved Notes</p>
            <p className="text-2xl font-bold text-slate-100 mt-0.5">{notes.length}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            📝
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active Alerts</p>
            <p className="text-2xl font-bold text-slate-100 mt-0.5">{reminders.filter((r) => r.status === 'pending').length}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            🔔
          </div>
        </div>
      </div>

      {/* Active Conversation Follow-up Banner */}
      {conversationHistory.length > 0 && (
        <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl flex items-center justify-between text-xs text-indigo-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
            <span>Follow-up Conversation Active ({conversationHistory.length} messages in context)</span>
          </div>
          <button onClick={clearConversation} className="underline opacity-80 hover:opacity-100 font-medium">
            Reset Context
          </button>
        </div>
      )}

      {/* AI Assistant Prominent Input */}
      <AIInput onSubmit={handleAISubmit} loading={aiLoading} />

      {/* Action Bar: Search & Manual Add */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items..."
            className="w-full px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1.5 text-xs text-slate-500">
              ✕
            </button>
          )}
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition flex items-center gap-1.5"
        >
          <span>+</span> Manual Add
        </button>
      </div>

      {/* AI Feedback Alerts */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : feedback.type === 'question'
              ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
              : 'bg-red-500/10 border-red-500/20 text-red-300'
          }`}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-0.5">
              {feedback.type === 'question' ? '🤖 Assistant Question' : feedback.type === 'success' ? '✨ Action Executed' : '⚠️ Error'}
            </p>
            <p className="text-sm font-medium">{feedback.message}</p>
            {feedback.question && (
              <p className="text-sm font-semibold text-white mt-1 bg-indigo-950/60 p-2.5 rounded-lg border border-indigo-500/30">
                &quot;{feedback.question}&quot;
              </p>
            )}
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('today')}
          className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition flex items-center gap-2 ${
            activeTab === 'today'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          ☀️ Today
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-950/50">
            {todayTasks.length + todayEvents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition flex items-center gap-2 ${
            activeTab === 'upcoming'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          📆 Upcoming (7 Days)
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-950/50">
            {upcomingTasks.length + upcomingEvents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition flex items-center gap-2 ${
            activeTab === 'tasks'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          ✅ Tasks ({filteredTasks.length})
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition flex items-center gap-2 ${
            activeTab === 'events'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          📅 Events ({filteredEvents.length})
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition flex items-center gap-2 ${
            activeTab === 'notes'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          📝 Notes ({filteredNotes.length})
        </button>

        <button
          onClick={() => setActiveTab('reminders')}
          className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition flex items-center gap-2 ${
            activeTab === 'reminders'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          🔔 Reminders ({reminders.length})
        </button>
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        {activeTab === 'today' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Today&apos;s Scheduled Events</h3>
              <EventList events={todayEvents} onDelete={handleDeleteEvent} loading={loading} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Today&apos;s Tasks</h3>
              <TaskList tasks={todayTasks} onToggleComplete={handleToggleTask} onDelete={handleDeleteTask} loading={loading} />
            </div>
          </div>
        )}

        {activeTab === 'upcoming' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Upcoming Events (Next 7 Days)</h3>
              <EventList events={upcomingEvents} onDelete={handleDeleteEvent} loading={loading} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Upcoming Tasks</h3>
              <TaskList tasks={upcomingTasks} onToggleComplete={handleToggleTask} onDelete={handleDeleteTask} loading={loading} />
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <TaskList tasks={filteredTasks} onToggleComplete={handleToggleTask} onDelete={handleDeleteTask} loading={loading} />
        )}

        {activeTab === 'events' && (
          <EventList events={filteredEvents} onDelete={handleDeleteEvent} loading={loading} />
        )}

        {activeTab === 'notes' && (
          <NoteList notes={filteredNotes} onDelete={handleDeleteNote} loading={loading} />
        )}

        {activeTab === 'reminders' && (
          <ReminderList reminders={reminders} onDelete={handleDeleteReminder} loading={loading} />
        )}
      </div>

      {/* Quick Create Modal */}
      <QuickCreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchAllData}
      />
    </div>
  );
}
