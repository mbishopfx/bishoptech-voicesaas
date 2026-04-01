import { getSupabaseAdminClient } from '@/lib/supabase-admin';

type WorkerJobInput = {
  queueName: string;
  jobType: string;
  organizationId?: string | null;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
};

export async function enqueueWorkerJob(input: WorkerJobInput) {
  const supabase = getSupabaseAdminClient();
  const result = await supabase
    .from('worker_jobs')
    .insert({
      queue_name: input.queueName,
      job_type: input.jobType,
      organization_id: input.organizationId ?? null,
      payload: input.payload,
      idempotency_key: input.idempotencyKey ?? null,
    })
    .select('id')
    .single();

  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? 'Unable to enqueue the background job.');
  }

  return result.data.id as string;
}
