import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { User } from '@supabase/supabase-js';

const DEMO_USER: User = {
  id: '00000000-0000-0000-0000-000000000000',
  app_metadata: { provider: 'email' },
  user_metadata: { name: 'Demo User' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'demo@lifeos.local',
  phone: '',
  role: 'authenticated',
  updated_at: new Date().toISOString(),
};

export async function getUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) return user;

    const isPlaceholder = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
    if (process.env.NODE_ENV === 'development' || isPlaceholder) {
      return DEMO_USER;
    }

    return null;
  } catch {
    const isPlaceholder = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
    if (process.env.NODE_ENV === 'development' || isPlaceholder) {
      return DEMO_USER;
    }
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
