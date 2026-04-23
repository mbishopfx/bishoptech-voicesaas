import { NextResponse } from 'next/server';

import { getViewerContext } from '@/lib/auth';
import { canViewerAccessOrganization, loadAssistantStats } from '@/lib/voiceops-platform';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ agentId: string }> }) {
  try {
    const viewer = await getViewerContext();
    const { agentId } = await params;

    if (!viewer) {
      return NextResponse.json({ error: 'You must be signed in to view assistant stats.' }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    const agentResult = await supabase
      .from('agents')
      .select('organization_id')
      .eq('id', agentId)
      .maybeSingle();

    if (agentResult.error || !agentResult.data) {
      return NextResponse.json({ error: 'Assistant not found.' }, { status: 404 });
    }

    if (!canViewerAccessOrganization(viewer, agentResult.data.organization_id as string)) {
      return NextResponse.json({ error: 'You do not have access to this assistant.' }, { status: 403 });
    }

    const stats = await loadAssistantStats(agentId);
    return NextResponse.json({ ok: true, stats });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load assistant stats.' },
      { status: 400 },
    );
  }
}
