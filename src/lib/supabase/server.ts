import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';

export async function createClient() {
  let cookieStore: any;
  try {
    cookieStore = await cookies();
  } catch {
    cookieStore = { getAll: () => [], set: () => {} };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll ? cookieStore.getAll() : [];
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set ? cookieStore.set(name, value, options) : null
          );
        } catch {
        }
      },
    },
  });
}
