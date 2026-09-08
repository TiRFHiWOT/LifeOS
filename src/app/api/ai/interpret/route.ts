import { getUser } from '@/lib/auth';
import { interpretNaturalLanguage } from '@/services/ai';
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

    const result = await interpretNaturalLanguage(prompt.trim(), referenceDateISO, conversationHistory);
    return NextResponse.json({ interpretation: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error during AI interpretation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
