import { runDemoScenarios } from '@/lib/testing/scenarios';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const results = await runDemoScenarios();
    const allPassed = results.every((r) => r.passed);
    return NextResponse.json({
      success: allPassed,
      results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error during test run';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
