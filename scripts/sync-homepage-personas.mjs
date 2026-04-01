import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const envPath = path.join(root, 'apps/web/.env.local');
const dataPath = path.join(root, 'apps/web/src/data/homepage-personas.json');

function parseEnv(text) {
  const env = {};

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eqIndex = trimmed.indexOf('=');

    if (eqIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex);
    let value = trimmed.slice(eqIndex + 1);

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

async function vapiFetch(pathname, init, apiKey) {
  const res = await fetch(`https://api.vapi.ai${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error(`Vapi ${res.status} ${pathname}: ${await res.text()}`);
  }

  return res.json();
}

async function main() {
  const env = parseEnv(await fs.readFile(envPath, 'utf8'));
  const apiKey = env.VAPI_API_KEY;
  const modelProvider = env.VAPI_DEFAULT_MODEL_PROVIDER ?? 'openai';
  const modelName = env.VAPI_DEFAULT_MODEL_NAME ?? 'gpt-realtime-2025-08-28';
  const voiceProvider = env.VAPI_DEFAULT_VOICE_PROVIDER ?? 'openai';

  if (!apiKey) {
    throw new Error('Missing VAPI_API_KEY in apps/web/.env.local');
  }

  const personas = JSON.parse(await fs.readFile(dataPath, 'utf8'));
  const existingAssistants = await vapiFetch('/assistant', { method: 'GET' }, apiKey);
  const assistantByName = new Map(existingAssistants.map((assistant) => [assistant.name, assistant]));

  const synced = [];

  for (const persona of personas) {
    const existing = assistantByName.get(persona.name);

    if (existing) {
      persona.assistantId = existing.id;
      synced.push({ name: persona.name, id: existing.id, status: 'reused' });
      continue;
    }

    const created = await vapiFetch(
      '/assistant',
      {
        method: 'POST',
        body: JSON.stringify({
          name: persona.name,
          firstMessage: persona.firstMessage,
          model: {
            provider: modelProvider,
            model: modelName,
            messages: [
              {
                role: 'system',
                content: persona.systemPrompt,
              },
            ],
          },
          voice: {
            provider: voiceProvider,
            voiceId: persona.voiceId,
            fallbackPlan: {
              voices: [
                {
                  provider: voiceProvider,
                  voiceId: persona.fallbackVoiceId,
                },
              ],
            },
          },
        }),
      },
      apiKey,
    );

    persona.assistantId = created.id;
    synced.push({ name: persona.name, id: created.id, status: 'created' });
  }

  await fs.writeFile(dataPath, `${JSON.stringify(personas, null, 2)}\n`);

  console.table(synced);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
