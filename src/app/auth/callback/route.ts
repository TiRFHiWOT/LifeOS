import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`);
      if (data.session?.provider_token) {
        response.cookies.set('google_access_token', data.session.provider_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: data.session.expires_in || 3600,
          path: '/',
        });
      }
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Could%20not%20authenticate%20user`);
}
