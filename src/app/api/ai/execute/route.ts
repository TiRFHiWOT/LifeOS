import { getUser } from '@/lib/auth';
import { interpretNaturalLanguage } from '@/services/ai';
import { orchestrateAIAction } from '@/services/orchestrator';
import { getTasks } from '@/services/tasks';
import { getEvents } from '@/services/events';
import { getNotes } from '@/services/notes';
import { getReminders } from '@/services/reminders';
import { UserContextSummary } from '@/types/ai';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const googleAccessToken = cookieStore.get('google_access_token')?.value;

    const body = await request.json();
    const { prompt, referenceDateISO, conversationHistory, interpretation: providedInterpretation } = body;

    let interpretation = providedInterpretation;

    if (!interpretation) {
      if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
        return NextResponse.json({ error: 'Prompt string or valid interpretation object is required' }, { status: 400 });
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

      interpretation = await interpretNaturalLanguage(prompt.trim(), referenceDateISO, conversationHistory, userContext);
    }

    const actionResult = await orchestrateAIAction(user.id, interpretation, googleAccessToken);

    return NextResponse.json({
      interpretation,
      actionResult,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error during AI action execution';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
