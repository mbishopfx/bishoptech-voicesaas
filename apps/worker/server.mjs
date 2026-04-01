import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

import { createClient } from '@supabase/supabase-js';

const port = Number(process.env.PORT || 8080);
const workerId = process.env.RAILWAY_REPLICA_ID || process.env.HOSTNAME || `worker-${randomUUID().slice(0, 8)}`;
const pollIntervalMs = Number(process.env.WORKER_POLL_INTERVAL_MS || 3000);
const batchSize = Number(process.env.WORKER_BATCH_SIZE || 5);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vapiApiKey = process.env.VAPI_API_KEY;
const vapiBaseUrl = process.env.VAPI_BASE_URL || 'https://api.vapi.ai';
const hasSupabase = Boolean(supabaseUrl && supabaseServiceRoleKey);
const hasVapi = Boolean(vapiApiKey);
const workerSharedSecret = process.env.WORKER_SHARED_SECRET || '';
const webhookSecret = process.env.VAPI_WEBHOOK_SECRET || '';

const queueState = {
  isDraining: false,
  processedCampaigns: 0,
  failedCampaigns: 0,
  receivedWebhooks: 0,
  lastLoopAt: null,
  lastError: null,
};

const supabase = hasSupabase
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

function json(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
  });
  response.end(JSON.stringify(payload));
}

function getRequestSecret(request) {
  return request.headers['x-worker-secret'] || request.headers['authorization']?.replace(/^Bearer\s+/i, '') || '';
}

function isAuthorizedRequest(request) {
  if (!workerSharedSecret) {
    return true;
  }

  return getRequestSecret(request) === workerSharedSecret;
}

function isWebhookAuthorized(request) {
  if (!webhookSecret) {
    return true;
  }

  return request.headers['x-vapi-secret'] === webhookSecret || request.headers['authorization']?.replace(/^Bearer\s+/i, '') === webhookSecret;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let data = '';
    request.on('data', (chunk) => {
      data += chunk;
    });
    request.on('end', () => resolve(data));
    request.on('error', reject);
  });
}

async function readJsonBody(request) {
  const rawBody = await readBody(request);

  if (!rawBody) {
    return {};
  }

  return JSON.parse(rawBody);
}

function ensureSupabase() {
  if (!supabase) {
    throw new Error('Supabase worker environment is not configured.');
  }

  return supabase;
}

function ensureVapi() {
  if (!hasVapi) {
    throw new Error('Vapi API access is not configured on the worker.');
  }
}

function resolveOrganizationId(payload) {
  const candidates = [
    payload?.organizationId,
    payload?.metadata?.organizationId,
    payload?.call?.metadata?.organizationId,
    payload?.call?.assistant?.metadata?.organizationId,
    payload?.assistant?.metadata?.organizationId,
  ];

  return candidates.find((candidate) => typeof candidate === 'string' && candidate.length > 0) || null;
}

function resolveEventType(payload) {
  return payload?.type || payload?.event || payload?.message?.type || 'unknown';
}

function resolveExternalId(payload) {
  const candidates = [
    payload?.id,
    payload?.message?.id,
    payload?.call?.id,
    payload?.callId,
    payload?.vapiCallId,
  ];

  return candidates.find((candidate) => typeof candidate === 'string' && candidate.length > 0) || null;
}

async function vapiFetch(path, init = {}, idempotencyKey) {
  ensureVapi();

  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${vapiApiKey}`);
  headers.set('Content-Type', 'application/json');

  if (idempotencyKey) {
    headers.set('Idempotency-Key', idempotencyKey);
  }

  const response = await fetch(`${vapiBaseUrl}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Vapi API error ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function claimWorkerJobs(queueName) {
  const client = ensureSupabase();
  const result = await client.rpc('claim_worker_jobs', {
    target_queue: queueName,
    worker_name: workerId,
    batch_size: batchSize,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data || [];
}

async function markJobCompleted(jobId) {
  const client = ensureSupabase();
  const result = await client
    .from('worker_jobs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      locked_at: null,
      locked_by: null,
      last_error: null,
    })
    .eq('id', jobId);

  if (result.error) {
    throw new Error(result.error.message);
  }
}

async function markJobFailed(job, error) {
  const client = ensureSupabase();
  const attempts = Number(job.attempts || 1);
  const maxAttempts = Number(job.max_attempts || 8);
  const retryDelaySeconds = Math.min(300, Math.max(20, attempts * 30));
  const nextStatus = attempts >= maxAttempts ? 'failed' : 'queued';

  const result = await client
    .from('worker_jobs')
    .update({
      status: nextStatus,
      available_at: new Date(Date.now() + retryDelaySeconds * 1000).toISOString(),
      locked_at: null,
      locked_by: null,
      last_error: error instanceof Error ? error.message : String(error),
      completed_at: nextStatus === 'failed' ? new Date().toISOString() : null,
    })
    .eq('id', job.id);

  if (result.error) {
    throw new Error(result.error.message);
  }
}

function getVoiceDefaults() {
  return {
    modelProvider: process.env.VAPI_DEFAULT_MODEL_PROVIDER || 'openai',
    modelName: process.env.VAPI_DEFAULT_MODEL_NAME || 'gpt-realtime-2025-08-28',
    voiceProvider: process.env.VAPI_DEFAULT_VOICE_PROVIDER || 'openai',
    voiceId: process.env.VAPI_DEFAULT_VOICE_ID || 'cedar',
    fallbackVoiceProvider: process.env.VAPI_FALLBACK_VOICE_PROVIDER || 'openai',
    fallbackVoiceId: process.env.VAPI_FALLBACK_VOICE_ID || 'marin',
  };
}

async function processCampaignLaunchJob(job) {
  const client = ensureSupabase();
  const payload = job.payload || {};
  const campaignRecordId = payload.campaignRecordId;
  const sourceAgentId = payload.sourceAgentId;
  const campaignName = payload.campaignName;
  const script = payload.script;

  if (typeof campaignRecordId !== 'string' || typeof sourceAgentId !== 'string' || typeof campaignName !== 'string' || typeof script !== 'string') {
    throw new Error('Campaign launch job payload is missing the required fields.');
  }

  const [campaignResult, recipientsResult, agentResult] = await Promise.all([
    client.from('campaigns').select('id, status, target_filter, schedule').eq('id', campaignRecordId).maybeSingle(),
    client
      .from('campaign_recipients')
      .select('id, contact_name, phone_number, row_number, status')
      .eq('campaign_id', campaignRecordId)
      .order('row_number', { ascending: true }),
    client.from('agents').select('id, name, vapi_assistant_id, config').eq('id', sourceAgentId).maybeSingle(),
  ]);

  if (campaignResult.error || !campaignResult.data) {
    throw new Error(campaignResult.error?.message || 'Campaign record could not be loaded.');
  }

  if (campaignResult.data.status === 'active') {
    return;
  }

  if (recipientsResult.error) {
    throw new Error(recipientsResult.error.message);
  }

  if (agentResult.error || !agentResult.data) {
    throw new Error(agentResult.error?.message || 'Source outbound agent could not be loaded.');
  }

  const recipients = (recipientsResult.data || []).filter((recipient) => recipient.phone_number);

  if (!recipients.length) {
    throw new Error('Campaign has no valid recipients to dispatch.');
  }

  const defaults = getVoiceDefaults();
  const sourceVoice = String(agentResult.data.config?.voiceId || defaults.voiceId);
  const resolvedPhoneNumberId =
    (typeof payload.phoneNumberId === 'string' && payload.phoneNumberId) ||
    process.env.VAPI_OUTBOUND_PHONE_NUMBER_ID ||
    '';

  if (!resolvedPhoneNumberId) {
    throw new Error('No outbound phone number is configured for the worker.');
  }

  const assistant = await vapiFetch(
    '/assistant',
    {
      method: 'POST',
      body: JSON.stringify({
        name: `${campaignName} Broadcast Agent`,
        firstMessage: script,
        model: {
          provider: defaults.modelProvider,
          model: defaults.modelName,
          messages: [
            {
              role: 'system',
              content: [
                'You are a dedicated outbound broadcast agent.',
                'Introduce the business immediately, explain the reason for the outreach, and respect opt-out signals.',
                `Campaign script: ${script}`,
                `Source organization agent: ${agentResult.data.name}`,
                agentResult.data.vapi_assistant_id ? `Source Vapi assistant: ${agentResult.data.vapi_assistant_id}` : null,
              ]
                .filter(Boolean)
                .join('\n'),
            },
          ],
        },
        voice: {
          provider: defaults.voiceProvider,
          voiceId: typeof payload.voiceLabel === 'string' && payload.voiceLabel ? payload.voiceLabel : sourceVoice,
          fallbackPlan: {
            voices: [
              {
                provider: defaults.fallbackVoiceProvider,
                voiceId: defaults.fallbackVoiceId,
              },
            ],
          },
        },
      }),
    },
    `campaign-assistant-${campaignRecordId}`,
  );

  const campaign = await vapiFetch(
    '/campaign',
    {
      method: 'POST',
      body: JSON.stringify({
        name: campaignName,
        assistantId: assistant.id,
        phoneNumberId: resolvedPhoneNumberId,
        customers: recipients.map((recipient) => ({
          number: recipient.phone_number,
          name: recipient.contact_name || undefined,
        })),
      }),
    },
    `campaign-${campaignRecordId}`,
  );

  const nextTargetFilter = {
    ...(campaignResult.data.target_filter || {}),
    acceptedRecipients: recipients.length,
    vapiCampaignId: campaign.id,
  };
  const nextSchedule = {
    ...(campaignResult.data.schedule || {}),
    generatedAssistantId: assistant.id,
    phoneNumberId: resolvedPhoneNumberId,
    launchedAt: new Date().toISOString(),
    dispatchedBy: workerId,
  };

  const [campaignUpdate, recipientUpdate] = await Promise.all([
    client
      .from('campaigns')
      .update({
        status: 'active',
        target_filter: nextTargetFilter,
        schedule: nextSchedule,
      })
      .eq('id', campaignRecordId),
    client
      .from('campaign_recipients')
      .update({
        status: 'submitted',
      })
      .eq('campaign_id', campaignRecordId),
  ]);

  if (campaignUpdate.error) {
    throw new Error(campaignUpdate.error.message);
  }

  if (recipientUpdate.error) {
    throw new Error(recipientUpdate.error.message);
  }
}

async function drainQueue(queueName = 'campaign-dispatch') {
  if (queueState.isDraining || !supabase) {
    return { accepted: false, reason: queueState.isDraining ? 'already-draining' : 'supabase-missing' };
  }

  queueState.isDraining = true;
  queueState.lastLoopAt = new Date().toISOString();

  try {
    const jobs = await claimWorkerJobs(queueName);

    await Promise.all(
      jobs.map(async (job) => {
        try {
          if (job.job_type === 'campaign.launch') {
            await processCampaignLaunchJob(job);
            queueState.processedCampaigns += 1;
          }

          await markJobCompleted(job.id);
        } catch (error) {
          queueState.failedCampaigns += 1;
          queueState.lastError = error instanceof Error ? error.message : String(error);

          if (job.job_type === 'campaign.launch') {
            const campaignRecordId = job.payload?.campaignRecordId;

            if (typeof campaignRecordId === 'string') {
              await supabase
                .from('campaigns')
                .update({
                  status: 'failed',
                })
                .eq('id', campaignRecordId);
            }
          }

          await markJobFailed(job, error);
        }
      }),
    );

    return { accepted: true, claimed: jobs.length };
  } finally {
    queueState.isDraining = false;
  }
}

function scheduleQueueDrain() {
  if (!supabase) {
    return;
  }

  setInterval(() => {
    void drainQueue().catch((error) => {
      queueState.lastError = error instanceof Error ? error.message : String(error);
    });
  }, pollIntervalMs);

  void drainQueue().catch((error) => {
    queueState.lastError = error instanceof Error ? error.message : String(error);
  });
}

scheduleQueueDrain();

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

  if (request.method === 'GET' && url.pathname === '/health') {
    return json(response, 200, {
      ok: true,
      service: 'vapi-voice-ops-worker',
      workerId,
      supabaseReady: hasSupabase,
      vapiReady: hasVapi,
      batchSize,
      pollIntervalMs,
      queueState,
      timestamp: new Date().toISOString(),
    });
  }

  if (request.method === 'POST' && url.pathname === '/jobs/blast-dispatch') {
    if (!isAuthorizedRequest(request)) {
      return json(response, 401, { error: 'unauthorized' });
    }

    try {
      const result = await drainQueue('campaign-dispatch');
      return json(response, 202, result);
    } catch (error) {
      return json(response, 500, {
        error: error instanceof Error ? error.message : 'Unable to drain the campaign queue.',
      });
    }
  }

  if (request.method === 'POST' && url.pathname === '/webhooks/vapi/call-events') {
    if (!isWebhookAuthorized(request)) {
      return json(response, 401, { error: 'unauthorized' });
    }

    try {
      const client = ensureSupabase();
      const payload = await readJsonBody(request);
      const insert = await client.from('worker_event_ingests').upsert(
        {
          organization_id: resolveOrganizationId(payload),
          provider: 'vapi',
          event_type: resolveEventType(payload),
          external_id: resolveExternalId(payload),
          payload,
        },
        {
          onConflict: 'provider,external_id',
          ignoreDuplicates: false,
        },
      );

      if (insert.error) {
        throw new Error(insert.error.message);
      }

      queueState.receivedWebhooks += 1;

      return json(response, 202, {
        accepted: true,
        eventType: resolveEventType(payload),
        receivedAt: new Date().toISOString(),
      });
    } catch (error) {
      return json(response, 500, {
        error: error instanceof Error ? error.message : 'Unable to persist the webhook event.',
      });
    }
  }

  return json(response, 404, {
    error: 'not_found',
  });
});

server.listen(port, () => {
  console.log(`vapi-voice-ops-worker listening on port ${port}`);
});
