import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { appConfig } from '@/lib/app-config';

type CookieMutation = {
  name: string;
  value: string;
  options?: Parameters<Awaited<ReturnType<typeof cookies>>['set']>[2];
};

export function isSupabaseServerConfigured() {
  return Boolean(appConfig.supabase.url && appConfig.supabase.anonKey);
}

export async function createSupabaseServerClient() {
  if (!isSupabaseServerConfigured()) {
    throw new Error('Supabase server client is not configured.');
  }

  const supabaseUrl = appConfig.supabase.url as string;
  const supabaseAnonKey = appConfig.supabase.anonKey as string;
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieMutation[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot always write cookies during render.
        }
      },
    },
  });
}
