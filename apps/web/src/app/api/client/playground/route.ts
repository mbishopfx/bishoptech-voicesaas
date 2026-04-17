import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireViewer } from '@/lib/auth';
import { clientPlaygroundScenarios, getIcpTemplatePack } from '@/lib/icp-packs';
import { safeInsert } from '@/lib/ops-storage';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

const clientPlaygroundSchema = z.object({
  organizationId: z.string().uuid(),
  scenarioId: z.string().min(1),
  targetPhoneNumber: z.string().min(7),
  assistantId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const viewer = await requireViewer();
    const payload = clientPlaygroundSchema.parse(await request.json());
    const membership = viewer.memberships.find((item) => item.organizationId === payload.organizationId);

    if (!viewer.isPlatformAdmin && !membership) {
      return NextResponse.json({ ok: false, error: 'You do not have access to this organization.' }, { status: 403 });
    }

    const scenario = clientPlaygroundScenarios.find((item) => item.id === payload.scenarioId);

    if (!scenario) {
      return NextResponse.json({ ok: false, error: 'Scenario not found.' }, { status: 404 });
    }

    const session = {
      id: randomUUID(),
      organization_id: payload.organizationId,
      assistant_id: payload.assistantId ?? null,
      icp_pack_id: getIcpTemplatePack(scenario.icpPackId).id,
      target_phone_number: payload.targetPhoneNumber,
      assigned_number_label: 'Client playground line',
      scenario_label: scenario.label,
      status: 'queued',
    };

    await safeInsert(getSupabaseAdminClient(), 'demo_sessions', session);

    return NextResponse.json({
      ok: true,
      session: {
        id: session.id,
        label: scenario.label,
        expectedSignals: scenario.expectedSignals,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unable to queue playground call.' },
      { status: 400 },
    );
  }
}
