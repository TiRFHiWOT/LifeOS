import { getUser } from '@/lib/auth';
import { processDueReminders, generateProactiveAgentAlerts } from '@/services/reminderEngine';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const nowISO = new Date().toISOString();

    const [proactiveAlerts] = await Promise.all([
      generateProactiveAgentAlerts(user.id),
      processDueReminders(),
    ]);

    const { data: pendingDue } = await supabase
      .from('reminders')
      .select(`
        id,
        user_id,
        task_id,
        event_id,
        remind_at,
        status,
        tasks ( id, title, description ),
        events ( id, title, description )
      `)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .lte('remind_at', nowISO);

    const { data: recentSent } = await supabase
      .from('reminders')
      .select(`
        id,
        user_id,
        task_id,
        event_id,
        remind_at,
        status,
        tasks ( id, title, description ),
        events ( id, title, description )
      `)
      .eq('user_id', user.id)
      .eq('status', 'sent')
      .gte('remind_at', tenMinutesAgo)
      .lte('remind_at', nowISO);

    const combinedMap = new Map();
    (pendingDue || []).forEach((r) => combinedMap.set(r.id, r));
    (recentSent || []).forEach((r) => combinedMap.set(r.id, r));

    const dueReminders = Array.from(combinedMap.values());

    return NextResponse.json({
      success: true,
      timestamp: nowISO,
      proactiveAlerts,
      dueReminders,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error during reminder check';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
