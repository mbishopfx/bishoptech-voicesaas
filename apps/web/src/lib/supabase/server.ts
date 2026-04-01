import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { appConfig } from '@/lib/app-config';

type CookieMutation = {
  name: string;
  value: string;
  options?: Parameters<Awaited<ReturnType<typeof cookies>>['set']>[2];
};

export async function createSupabaseServerClient() {
  if (!appConfig.supabase.url || !appConfig.supabase.anonKey) {
    throw new Error('Supabase server client is not configured.');
  }

  const cookieStore = await cookies();

  return createServerClient(appConfig.supabase.url, appConfig.supabase.anonKey, {
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
