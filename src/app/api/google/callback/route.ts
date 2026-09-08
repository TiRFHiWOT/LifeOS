import { getUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const user = await getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=Unauthorized`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=Google%20OAuth%20code%20missing`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/google/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/?error=Google%20OAuth%20credentials%20not%20configured`);
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(errorData.error_description || 'Token exchange failed')}`);
    }

    const tokens = await tokenResponse.json();

    // Store tokens in cookie or session securely
    const response = NextResponse.redirect(`${origin}/?google_connected=true`);
    response.cookies.set('google_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: tokens.expires_in || 3600,
      path: '/',
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Google OAuth exchange failed';
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(message)}`);
  }
}
