import { NextResponse } from 'next/server';
import { z } from 'zod';

import { canManageOrganization, getViewerContext } from '@/lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

const workflowBoardSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  title: z.string().min(2),
  description: z.string().optional(),
  nodes: z.array(z.record(z.unknown())),
  edges: z.array(z.record(z.unknown())),
});

export async function POST(request: Request) {
  try {
    const viewer = await getViewerContext();

    if (!viewer) {
      return NextResponse.json({ error: 'You must be signed in to save workflow boards.' }, { status: 401 });
    }

    const payload = workflowBoardSchema.parse(await request.json());

    if (!canManageOrganization(viewer, payload.organizationId)) {
      return NextResponse.json({ error: 'You do not have permission to update this workflow board.' }, { status: 403 });
    }

    const supabase = getSupabaseAdminClient();

    if (payload.id) {
      const updateResult = await supabase
        .from('workflow_boards')
        .update({
          title: payload.title,
          description: payload.description,
          nodes: payload.nodes,
          edges: payload.edges,
        })
        .eq('id', payload.id)
        .eq('organization_id', payload.organizationId)
        .select('id')
        .single();

      if (updateResult.error || !updateResult.data) {
        throw new Error(updateResult.error?.message ?? 'Unable to update the workflow board.');
      }

      return NextResponse.json({
        id: updateResult.data.id,
        message: 'Workflow board saved.',
      });
    }

    const insertResult = await supabase
      .from('workflow_boards')
      .insert({
        organization_id: payload.organizationId,
        title: payload.title,
        description: payload.description,
        nodes: payload.nodes,
        edges: payload.edges,
        created_by: viewer.id,
      })
      .select('id')
      .single();

    if (insertResult.error || !insertResult.data) {
      throw new Error(insertResult.error?.message ?? 'Unable to create the workflow board.');
    }

    return NextResponse.json({
      id: insertResult.data.id,
      message: 'Workflow board saved.',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to save the workflow board.',
      },
      { status: 400 },
    );
  }
}
