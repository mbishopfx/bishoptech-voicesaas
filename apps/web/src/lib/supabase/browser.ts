import { createBrowserClient } from '@supabase/ssr';

import { appConfig } from '@/lib/app-config';

export function createSupabaseBrowserClient() {
  if (!appConfig.supabase.url || !appConfig.supabase.anonKey) {
    throw new Error('Supabase browser client is not configured.');
  }

  return createBrowserClient(appConfig.supabase.url, appConfig.supabase.anonKey);
}
