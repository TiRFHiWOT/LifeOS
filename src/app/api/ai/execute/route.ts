import { getUser } from '@/lib/auth';
import { interpretNaturalLanguage } from '@/services/ai';
import { orchestrateAIAction } from '@/services/orchestrator';
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
      interpretation = await interpretNaturalLanguage(prompt.trim(), referenceDateISO, conversationHistory);
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
