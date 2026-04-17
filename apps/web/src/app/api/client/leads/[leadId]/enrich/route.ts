import { NextResponse } from 'next/server';

import { requireViewer } from '@/lib/auth';
import { enrichLeadRecord } from '@/lib/lead-ops';
import { safeInsert, safeUpdateById } from '@/lib/ops-storage';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

type ContactRow = {
  id: string;
  organization_id: string;
  full_name: string | null;
  phone_e164: string | null;
  source: string | null;
  metadata: Record<string, unknown> | null;
};

export async function POST(_request: Request, { params }: { params: Promise<{ leadId: string }> }) {
  try {
    const viewer = await requireViewer();
    const { leadId } = await params;
    const supabase = getSupabaseAdminClient();
    const leadResult = await supabase
      .from('contacts')
      .select('id, organization_id, full_name, phone_e164, source, metadata')
      .eq('id', leadId)
      .maybeSingle();

    if (leadResult.error || !leadResult.data) {
      return NextResponse.json({ ok: false, error: 'Lead not found.' }, { status: 404 });
    }

    const lead = leadResult.data as ContactRow;
    const membership = viewer.memberships.find((item) => item.organizationId === lead.organization_id);

    if (!viewer.isPlatformAdmin && !membership) {
      return NextResponse.json({ ok: false, error: 'You do not have access to this lead.' }, { status: 403 });
    }

    const run = await enrichLeadRecord({
      organizationId: lead.organization_id,
      leadId: lead.id,
      icpPackId: typeof lead.metadata?.icpPackId === 'string' ? lead.metadata.icpPackId : undefined,
      name: lead.full_name ?? undefined,
      company: typeof lead.metadata?.company === 'string' ? lead.metadata.company : undefined,
      phone: lead.phone_e164 ?? undefined,
      email: typeof lead.metadata?.email === 'string' ? lead.metadata.email : undefined,
      service: typeof lead.metadata?.service === 'string' ? lead.metadata.service : undefined,
      source: lead.source ?? undefined,
    });

    await safeInsert(supabase, 'lead_enrichment_runs', {
      id: run.id,
      organization_id: run.organizationId ?? null,
      lead_id: run.leadId,
      provider: run.provider,
      status: run.status,
      summary: run.summary,
      enrichment: run.enrichment,
    });

    await safeUpdateById(supabase, 'contacts', lead.id, {
      metadata: {
        ...(lead.metadata ?? {}),
        enrichmentStatus: run.status,
        enrichmentSummary: run.summary,
        enrichment: run.enrichment,
      },
    });

    return NextResponse.json({ ok: true, run });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Lead enrichment failed.' },
      { status: 400 },
    );
  }
}
