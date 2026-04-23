#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const appRoot = path.resolve(__dirname, '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function readArg(flag) {
  const index = process.argv.indexOf(flag);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

async function findUserByEmail(supabase, email) {
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw error;
    }

    const user = data.users.find((entry) => (entry.email ?? '').toLowerCase() === email.toLowerCase());

    if (user) {
      return user;
    }

    if (!data.users.length || data.users.length < 200) {
      return null;
    }

    page += 1;
  }
}

async function main() {
  loadEnvFile(path.join(repoRoot, '.env.local'));
  loadEnvFile(path.join(appRoot, '.env.local'));
  loadEnvFile(path.join(repoRoot, '.vercel/.env.development.local'));
  loadEnvFile(path.join(appRoot, '.vercel/.env.development.local'));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase URL or service role key. Check .env.local.');
  }

  const email = readArg('--email') ?? process.env.OWNER_EMAIL ?? 'matt@bishoptech.dev';
  const password = readArg('--password') ?? process.env.OWNER_PASSWORD;
  const fullName = readArg('--name') ?? process.env.OWNER_NAME ?? 'Matt Bishop';

  if (!password) {
    throw new Error('Missing owner password. Pass --password or set OWNER_PASSWORD.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const existingUser = await findUserByEmail(supabase, email);
  let user = existingUser;

  if (existingUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...(existingUser.user_metadata ?? {}),
        full_name: fullName,
      },
    });

    if (error || !data.user) {
      throw error ?? new Error('Unable to update the owner user.');
    }

    user = data.user;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (error || !data.user) {
      throw error ?? new Error('Unable to create the owner user.');
    }

    user = data.user;
  }

  if (!user) {
    throw new Error('Owner user was not resolved.');
  }

  const { error: profileError } = await supabase.from('user_profiles').upsert(
    {
      id: user.id,
      email,
      full_name: fullName,
    },
    { onConflict: 'id' },
  );

  if (profileError) {
    throw profileError;
  }

  const { error: adminError } = await supabase.from('platform_admins').upsert(
    { user_id: user.id },
    { onConflict: 'user_id' },
  );

  if (adminError) {
    throw adminError;
  }

  const { data: organizations, error: organizationsError } = await supabase.from('organizations').select('id');

  if (organizationsError) {
    throw organizationsError;
  }

  if ((organizations ?? []).length) {
    const memberships = organizations.map((organization) => ({
      organization_id: organization.id,
      user_id: user.id,
      role: 'owner',
      invited_by: user.id,
    }));

    const { error: membershipError } = await supabase.from('organization_members').upsert(memberships, {
      onConflict: 'organization_id,user_id',
    });

    if (membershipError) {
      throw membershipError;
    }
  }

  console.log(
    JSON.stringify(
      {
        email,
        userId: user.id,
        organizationsAssigned: organizations?.length ?? 0,
        created: !existingUser,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
