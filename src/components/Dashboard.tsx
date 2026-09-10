'use client';

import { useState, useEffect, useCallback } from 'react';
import AIInput from '@/components/AIInput';
import TaskList from '@/components/TaskList';
import EventList from '@/components/EventList';
import NoteList from '@/components/NoteList';
import ReminderList from '@/components/ReminderList';
import QuickCreateModal from '@/components/QuickCreateModal';
import ReminderAlertListener from '@/components/ReminderAlertListener';
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
    <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl glass-panel glass-panel-hover border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Events Today</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">{todayEvents.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-lg">
            📅
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl glass-panel glass-panel-hover border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Tasks</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">{tasks.filter((t) => !t.completed).length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg">
            ✅
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl glass-panel glass-panel-hover border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Saved Notes</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">{notes.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-lg">
            📝
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl glass-panel glass-panel-hover border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Alerts</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">{reminders.filter((r) => r.status === 'pending').length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-lg">
            🔔
          </div>
        </div>
      </div>

      {/* Conversation Follow-up Banner */}
      {conversationHistory.length > 0 && (
        <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 backdrop-blur-md flex items-center justify-between text-xs text-indigo-300 shadow-lg">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 ai-pulse-ring"></span>
            <span className="font-semibold">Conversational Context Active ({conversationHistory.length} turns)</span>
          </div>
          <button 
            onClick={clearConversation} 
            className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/30 transition-all duration-200 font-medium"
          >
            Clear Context
          </button>
        </div>
      )}

      {/* Signature AI Terminal Command Input */}
      <AIInput onSubmit={handleAISubmit} loading={aiLoading} />

      {/* Action Bar: Search & Manual Add */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter tasks, events, notes..."
            className="w-full px-4 py-2 rounded-xl glass-input text-slate-200 placeholder-slate-400 text-xs sm:text-sm"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')} 
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 text-xs font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm"
        >
          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Manual Add
        </button>
      </div>

      {/* AI Feedback Alerts */}
      {feedback && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border backdrop-blur-md flex items-start justify-between gap-3 shadow-xl transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : feedback.type === 'question'
              ? 'bg-indigo-950/50 border-indigo-500/40 text-indigo-200'
              : 'bg-red-950/40 border-red-500/30 text-red-300'
          }`}
        >
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              {feedback.type === 'question' ? '🤖 Assistant Follow-up' : feedback.type === 'success' ? '✨ Executed Successfully' : '⚠️ Action Error'}
            </p>
            <p className="text-sm font-medium text-slate-100">{feedback.message}</p>
            {feedback.question && (
              <div className="mt-2.5 p-3 rounded-xl bg-slate-950/80 border border-indigo-500/30 text-indigo-300 font-medium text-sm">
                &quot;{feedback.question}&quot;
              </div>
            )}
          </div>
          <button 
            onClick={() => setFeedback(null)} 
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-all duration-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Glass Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl glass-panel border border-white/10 overflow-x-auto">
        <button
          onClick={() => setActiveTab('today')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 shrink-0 ${
            activeTab === 'today'
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25 border border-white/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          ☀️ Today
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950/50 border border-white/10 font-mono">
            {todayTasks.length + todayEvents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 shrink-0 ${
            activeTab === 'upcoming'
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25 border border-white/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          📆 Upcoming
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950/50 border border-white/10 font-mono">
            {upcomingTasks.length + upcomingEvents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 shrink-0 ${
            activeTab === 'tasks'
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25 border border-white/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          ✅ Tasks ({filteredTasks.length})
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 shrink-0 ${
            activeTab === 'events'
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25 border border-white/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          📅 Events ({filteredEvents.length})
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 shrink-0 ${
            activeTab === 'notes'
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25 border border-white/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          📝 Notes ({filteredNotes.length})
        </button>

        <button
          onClick={() => setActiveTab('reminders')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 shrink-0 ${
            activeTab === 'reminders'
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25 border border-white/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          🔔 Alerts ({reminders.length})
        </button>
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        {activeTab === 'today' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                Today&apos;s Scheduled Events
              </h3>
              <EventList events={todayEvents} onDelete={handleDeleteEvent} loading={loading} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Today&apos;s Tasks
              </h3>
              <TaskList tasks={todayTasks} onToggleComplete={handleToggleTask} onDelete={handleDeleteTask} loading={loading} />
            </div>
          </div>
        )}

        {activeTab === 'upcoming' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                Upcoming Events (Next 7 Days)
              </h3>
              <EventList events={upcomingEvents} onDelete={handleDeleteEvent} loading={loading} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Upcoming Tasks
              </h3>
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

      {/* Global Real-Time Reminder Alert Engine */}
      <ReminderAlertListener />
    </div>
  );
}
