import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { User } from '@supabase/supabase-js';

export async function getUser() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

export function isUserGoogleConnected(user: User | null, googleAccessToken?: string): boolean {
  if (!user) return false;
  if (googleAccessToken) return true;
  if (user.app_metadata?.provider === 'google') return true;
  if (Array.isArray(user.app_metadata?.providers) && user.app_metadata.providers.includes('google')) return true;
  if (Array.isArray(user.identities) && user.identities.some(i => i.provider === 'google')) return true;
  return false;
}
