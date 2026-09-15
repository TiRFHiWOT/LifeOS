import { getUser } from '@/lib/auth';
import { interpretNaturalLanguage } from '@/services/ai';
import { getTasks } from '@/services/tasks';
import { getEvents } from '@/services/events';
import { getNotes } from '@/services/notes';
import { getReminders } from '@/services/reminders';
import { UserContextSummary } from '@/types/ai';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, referenceDateISO, conversationHistory } = await request.json();

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return NextResponse.json({ error: 'Prompt string is required' }, { status: 400 });
    }

    const [tasks, events, notes, reminders] = await Promise.all([
      getTasks(user.id),
      getEvents(user.id),
      getNotes(user.id),
      getReminders(user.id),
    ]);

    const userContext: UserContextSummary = {
      tasks: tasks.map((t) => ({ id: t.id, title: t.title, dueAt: t.due_at, completed: t.completed })),
      events: events.map((e) => ({ id: e.id, title: e.title, startAt: e.start_at, endAt: e.end_at })),
      notes: notes.map((n) => ({ id: n.id, title: n.title, content: n.content })),
      reminders: reminders.map((r) => ({ id: r.id, remindAt: r.remind_at })),
    };

    const result = await interpretNaturalLanguage(prompt.trim(), referenceDateISO, conversationHistory, userContext);
    return NextResponse.json({ interpretation: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error during AI interpretation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
