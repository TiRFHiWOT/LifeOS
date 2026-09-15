import { getUser } from '@/lib/auth';
import { getAgentActivityLogs } from '@/services/agentActivityLog';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activities = getAgentActivityLogs();
    return NextResponse.json({ activities });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch agent activities';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
