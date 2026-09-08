import { getUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${new URL(request.url).origin}/api/google/callback`;

  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_CLIENT_ID is not configured in environment' }, { status: 500 });
  }

  const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar.events');
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&access_type=offline&prompt=consent`;

  return NextResponse.redirect(googleAuthUrl);
}
