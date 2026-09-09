'use client';

import { useState, useEffect } from 'react';
import ResultCard, { ActionResultData } from '@/components/ResultCard';
import Link from 'next/link';
import { TaskItem, EventItem } from '@/types';
import { Database } from '@/types/database';

type TaskRow = Database['public']['Tables']['tasks']['Row'];
type EventRow = Database['public']['Tables']['events']['Row'];

interface ConversationMessage {
  role: 'user' | 'assistant';
  text: string;
}

function getGreeting() {
  if (typeof window === 'undefined') return 'Good evening';
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function AssistantHome() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ActionResultData | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const greeting = getGreeting();

  // Coming up teaser state
  const [upcomingEvents, setUpcomingEvents] = useState<EventItem[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<TaskItem[]>([]);

  const fetchUpcomingTeaser = async () => {
    try {
      const [eventsRes, tasksRes] = await Promise.all([
        fetch('/api/events').then((r) => r.json()),
        fetch('/api/tasks').then((r) => r.json()),
      ]);

      const now = new Date();
      if (eventsRes.events) {
        const sorted = eventsRes.events
          .map((e: EventRow) => ({
            id: e.id,
            userId: e.user_id,
            title: e.title,
            startAt: e.start_at,
            endAt: e.end_at,
          }))
          .filter((e: EventItem) => new Date(e.startAt) >= now)
          .sort((a: EventItem, b: EventItem) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
        setUpcomingEvents(sorted.slice(0, 2));
      }

      if (tasksRes.tasks) {
        const active = tasksRes.tasks
          .map((t: TaskRow) => ({
            id: t.id,
            userId: t.user_id,
            title: t.title,
            dueAt: t.due_at || undefined,
            completed: t.completed,
          }))
          .filter((t: TaskItem) => !t.completed)
          .slice(0, 2);
        setUpcomingTasks(active);
      }
    } catch (err) {
      console.error('Failed to load upcoming items:', err);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!ignore) {
        await fetchUpcomingTeaser();
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleSubmit = async (text: string) => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setResult(null);

    try {
      const updatedHistory: ConversationMessage[] = [...conversationHistory, { role: 'user', text }];

      const response = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          referenceDateISO: new Date().toISOString(),
          conversationHistory: updatedHistory,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI processing failed');

      const action = data.actionResult;
      setResult(action);

      if (action.actionType === 'missing_information') {
        const questionText = action.question || 'Could you specify details?';
        setConversationHistory([...updatedHistory, { role: 'assistant', text: questionText }]);
      } else {
        setConversationHistory([]);
        setPrompt('');
        fetchUpcomingTeaser();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process request';
      setResult({ actionType: 'error', success: false, message: msg });
      setConversationHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit(prompt);
  };

  const setExamplePrompt = (example: string) => {
    setPrompt(example);
  };

  return (
    <div className="max-w-lg w-full mx-auto px-4 py-8 sm:py-12 space-y-8 flex flex-col justify-center min-h-[calc(100vh-80px)]">
      {/* Clean Assistant Greeting */}
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-indigo-400 tracking-wide">{greeting}</p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
          What do you need me to remember?
        </h2>
      </div>

      {/* Primary Mobile-First Input Form */}
      <form onSubmit={handleFormSubmit} className="space-y-3">
        <div className="relative flex flex-col sm:flex-row items-center gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            placeholder="Doctor appointment Friday at 3 PM..."
            className="w-full px-5 py-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-base focus:outline-none focus:border-indigo-500 shadow-xl transition disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base transition shadow-lg shadow-indigo-500/25 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {loading ? 'Adding...' : 'Add'}
          </button>
        </div>
      </form>

      {/* Rotating Example Chips */}
      <div className="flex items-center justify-center gap-2 flex-wrap text-xs">
        <button
          type="button"
          onClick={() => setExamplePrompt('Dentist appointment Friday at 3 PM')}
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 transition"
        >
          Dentist Friday 3 PM
        </button>
        <button
          type="button"
          onClick={() => setExamplePrompt('Buy groceries tomorrow')}
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 transition"
        >
          Buy groceries
        </button>
        <button
          type="button"
          onClick={() => setExamplePrompt('My WiFi password is GuestWifi2026')}
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 transition"
        >
          WiFi password
        </button>
      </div>

      {/* Direct AI Result / Confirmation Card */}
      {result && (
        <ResultCard
          result={result}
          onClear={() => setResult(null)}
          onFollowUpSubmit={handleSubmit}
        />
      )}

      {/* Minimal "Coming Up" Teaser Section */}
      {!result && (upcomingEvents.length > 0 || upcomingTasks.length > 0) && (
        <div className="pt-6 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Coming up</span>
            <Link href="/calendar" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
              View all &rarr;
            </Link>
          </div>

          <div className="space-y-2">
            {upcomingEvents.map((evt) => (
              <div key={evt.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">📅</span>
                  <span className="font-semibold text-slate-200">{evt.title}</span>
                </div>
                <span className="text-indigo-300 font-mono">
                  {new Date(evt.startAt).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

            {upcomingTasks.map((t) => (
              <div key={t.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">✅</span>
                  <span className="font-semibold text-slate-200">{t.title}</span>
                </div>
                <span className="text-slate-400">Task</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
