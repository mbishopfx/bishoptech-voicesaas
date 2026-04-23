import { appConfig } from '@/lib/app-config';
import { listPhoneNumbers } from '@/lib/vapi';

export type LaunchReadinessItem = {
  id: string;
  label: string;
  status: 'ready' | 'warning' | 'blocked';
  detail: string;
};

export async function getLaunchReadinessChecklist(): Promise<LaunchReadinessItem[]> {
  const workerHealth = await (async () => {
    if (!appConfig.worker.baseUrl) {
      return {
        id: 'worker-health',
        label: 'Worker health',
        status: 'blocked' as const,
        detail: 'RAILWAY_WORKER_BASE_URL is not configured, so queue health cannot be verified.',
      };
    }

    try {
      const response = await fetch(`${appConfig.worker.baseUrl.replace(/\/$/, '')}/health`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        return {
          id: 'worker-health',
          label: 'Worker health',
          status: 'warning' as const,
          detail: `Worker responded with ${response.status}.`,
        };
      }

      return {
        id: 'worker-health',
        label: 'Worker health',
        status: 'ready' as const,
        detail: `Worker health check succeeded at ${appConfig.worker.baseUrl}.`,
      };
    } catch (error) {
      return {
        id: 'worker-health',
        label: 'Worker health',
        status: 'warning' as const,
        detail: error instanceof Error ? error.message : 'Unable to reach the configured worker health endpoint.',
      };
    }
  })();

  const vapiCredentialsReady = Boolean(appConfig.vapi.apiKey && appConfig.vapi.publicKey);
  const demoNumberReady = await (async () => {
    if (!appConfig.vapi.apiKey || !appConfig.vapi.demoPhoneNumberId) {
      return {
        id: 'demo-number',
        label: 'Demo number availability',
        status: 'blocked' as const,
        detail: 'VAPI_API_KEY or VAPI_DEMO_PHONE_NUMBER_ID is missing.',
      };
    }

    try {
      const numbers = await listPhoneNumbers({ limit: 100 }, appConfig.vapi.apiKey);
      const matched = numbers.find((item) => item.id === appConfig.vapi.demoPhoneNumberId);

      return matched
        ? {
            id: 'demo-number',
            label: 'Demo number availability',
            status: 'ready' as const,
            detail: `Configured demo number ${appConfig.vapi.demoPhoneNumberId} is visible in Vapi.`,
          }
        : {
            id: 'demo-number',
            label: 'Demo number availability',
            status: 'warning' as const,
            detail: `Configured demo number ${appConfig.vapi.demoPhoneNumberId} was not returned by the Vapi phone inventory.`,
          };
    } catch (error) {
      return {
        id: 'demo-number',
        label: 'Demo number availability',
        status: 'warning' as const,
        detail: error instanceof Error ? error.message : 'Unable to verify the configured demo number.',
      };
    }
  })();

  const supabaseReady = Boolean(appConfig.supabase.url && appConfig.supabase.anonKey && appConfig.supabase.hasServiceRole);
  const envParityReady = Boolean(
    appConfig.supabase.url &&
      appConfig.supabase.anonKey &&
      appConfig.supabase.hasServiceRole &&
      appConfig.vapi.apiKey &&
      appConfig.vapi.publicKey &&
      appConfig.vapi.demoPhoneNumberId &&
      appConfig.worker.baseUrl,
  );

  return [
    {
      id: 'build-gate',
      label: 'Web build gate',
      status: 'warning',
      detail: 'Typecheck and build are enforced by the Launch Watchtower automation before release.',
    },
    workerHealth,
    {
      id: 'vapi-creds',
      label: 'Vapi credentials',
      status: vapiCredentialsReady ? 'ready' : 'blocked',
      detail: vapiCredentialsReady
        ? 'Managed Vapi private and public keys are configured for provisioning and embeds.'
        : 'VAPI_API_KEY and NEXT_PUBLIC_VAPI_PUBLIC_KEY are both required for the launch path.',
    },
    demoNumberReady,
    {
      id: 'supabase-backbone',
      label: 'Supabase RLS and migration path',
      status: supabaseReady ? 'ready' : 'blocked',
      detail: supabaseReady
        ? 'Supabase URL, anon key, and service role are present; migration drift is monitored by Launch Watchtower.'
        : 'Supabase runtime keys are incomplete, so authenticated workspace scope cannot be trusted.',
    },
    {
      id: 'env-parity',
      label: 'Vercel and Railway env parity',
      status: envParityReady ? 'ready' : 'warning',
      detail: envParityReady
        ? 'Supabase, Vapi, embed, demo number, and worker envs are present for the full launch path.'
        : 'One or more deploy-time envs are missing, so parity still depends on the launch automation checks.',
    },
  ];
}
