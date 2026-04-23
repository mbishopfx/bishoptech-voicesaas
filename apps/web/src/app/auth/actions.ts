'use server';

import type { Route } from 'next';
import { redirect } from 'next/navigation';

import { createSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export async function loginAction(formData: FormData) {
  if (!isSupabaseServerConfigured()) {
    redirect('/login?error=Platform%20auth%20is%20not%20configured.%20Add%20the%20Supabase%20environment%20variables%20before%20signing%20in.' as Route);
  }

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}` as Route);
  }

  redirect('/launch' as Route);
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/' as Route);
}
