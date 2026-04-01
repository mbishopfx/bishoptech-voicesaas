import { createClient } from '@supabase/supabase-js';

import { appConfig } from '@/lib/app-config';

export function getSupabaseAdminClient() {
  if (!appConfig.supabase.url || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin environment is not configured.');
  }

  return createClient(appConfig.supabase.url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
