import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requirePlatformAdmin } from '@/lib/auth';
import { recoverLeadFromCall } from '@/lib/lead-ops';
import { safeInsert } from '@/lib/ops-storage';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

const leadRecoverySchema = z.object({
  organizationId: z.string().uuid().optional(),
  callId: z.string().optional(),
  leadId: z.string().optional(),
  icpPackId: z.string().optional(),
  transcript: z.string().min(10),
  summary: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    await requirePlatformAdmin();
    const payload = leadRecoverySchema.parse(await request.json());
    const run = await recoverLeadFromCall(payload);
    const supabase = getSupabaseAdminClient();

    await safeInsert(supabase, 'lead_recovery_runs', {
      id: run.id,
      organization_id: run.organizationId ?? null,
      call_id: run.callId ?? null,
      lead_id: run.leadId ?? null,
      icp_pack_id: run.icpPackId ?? null,
      provider: run.provider,
      status: run.status,
      confidence: run.confidence,
      missing_fields: run.missingFields,
      extracted_lead: run.extractedLead,
      notes: run.notes,
    });

    return NextResponse.json({ ok: true, run });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Lead recovery failed.' },
      { status: 400 },
    );
  }
}
