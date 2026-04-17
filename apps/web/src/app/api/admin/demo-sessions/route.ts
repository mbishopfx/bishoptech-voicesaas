import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requirePlatformAdmin } from '@/lib/auth';
import { getIcpTemplatePack } from '@/lib/icp-packs';
import { safeInsert } from '@/lib/ops-storage';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

const demoSessionSchema = z.object({
  organizationId: z.string().uuid(),
  icpPackId: z.string().min(1),
  assistantId: z.string().optional(),
  assistantVersionId: z.string().optional(),
  targetPhoneNumber: z.string().min(7),
  assignedNumberLabel: z.string().min(2),
  scenarioLabel: z.string().min(2),
});

export async function GET() {
  await requirePlatformAdmin();
  const supabase = getSupabaseAdminClient();
  const result = await supabase
    .from('demo_sessions')
    .select('id, organization_id, assistant_id, assistant_version_id, icp_pack_id, target_phone_number, assigned_number_label, scenario_label, status, resulting_call_id, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  return NextResponse.json({ sessions: result.error ? [] : result.data });
}

export async function POST(request: Request) {
  try {
    await requirePlatformAdmin();
    const payload = demoSessionSchema.parse(await request.json());
    const supabase = getSupabaseAdminClient();
    const sessionId = randomUUID();
    const icpPack = getIcpTemplatePack(payload.icpPackId);

    await safeInsert(supabase, 'demo_sessions', {
      id: sessionId,
      organization_id: payload.organizationId,
      assistant_id: payload.assistantId ?? null,
      assistant_version_id: payload.assistantVersionId ?? null,
      icp_pack_id: icpPack.id,
      target_phone_number: payload.targetPhoneNumber,
      assigned_number_label: payload.assignedNumberLabel,
      scenario_label: payload.scenarioLabel,
      status: 'queued',
    });

    return NextResponse.json({
      ok: true,
      session: {
        id: sessionId,
        icpPack,
        status: 'queued',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unable to create demo session.' },
      { status: 400 },
    );
  }
}
