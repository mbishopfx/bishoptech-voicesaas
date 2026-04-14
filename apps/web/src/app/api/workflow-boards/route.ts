import { NextResponse } from 'next/server';
import { z } from 'zod';

import { canManageOrganization, getViewerContext } from '@/lib/auth';
import { DEFAULT_WORKFLOW_PHASES } from '@/lib/workflow';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

const workflowNodeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  body: z.string().default(''),
  x: z.number().optional().default(0),
  y: z.number().optional().default(0),
  phase: z.string().optional(),
  kind: z.enum(['step', 'decision', 'handoff', 'system', 'outcome']).optional(),
  tone: z.enum(['metal', 'mint', 'amber']).optional(),
});

const workflowEdgeSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().optional(),
});

const workflowBoardSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  title: z.string().min(2),
  description: z.string().optional(),
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
  metadata: z
    .object({
      isTemplate: z.boolean().optional(),
      phaseOrder: z.array(z.string().min(1)).optional(),
      sharedLabel: z.string().optional(),
    })
    .optional(),
});

function normalizeMetadata(metadata?: z.infer<typeof workflowBoardSchema>['metadata']) {
  return {
    isTemplate: metadata?.isTemplate === true,
    phaseOrder: metadata?.phaseOrder?.length ? metadata.phaseOrder : [...DEFAULT_WORKFLOW_PHASES],
    sharedLabel: metadata?.sharedLabel,
  };
}

export async function GET(request: Request) {
  try {
    const viewer = await getViewerContext();

    if (!viewer) {
      return NextResponse.json({ error: 'You must be signed in to view workflow boards.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required.' }, { status: 400 });
    }

    if (!canManageOrganization(viewer, organizationId)) {
      return NextResponse.json({ error: 'You do not have permission to view workflow boards.' }, { status: 403 });
    }

    const supabase = getSupabaseAdminClient();
    const result = await supabase
      .from('workflow_boards')
      .select('id, organization_id, title, description, nodes, edges, metadata, updated_at')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false });

    if (result.error) {
      throw new Error(result.error.message);
    }

    const boards = (result.data ?? []).map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      title: row.title,
      description: row.description ?? '',
      nodes: Array.isArray(row.nodes) ? row.nodes : [],
      edges: Array.isArray(row.edges) ? row.edges : [],
      metadata: normalizeMetadata((row.metadata ?? undefined) as z.infer<typeof workflowBoardSchema>['metadata']),
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ boards });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to load workflow boards.',
      },
      { status: 400 },
    );
  }
}

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
    const metadata = normalizeMetadata(payload.metadata);

    if (payload.id) {
      const updateResult = await supabase
        .from('workflow_boards')
        .update({
          title: payload.title,
          description: payload.description,
          nodes: payload.nodes,
          edges: payload.edges,
          metadata,
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
        message: metadata.isTemplate ? 'Workflow template saved.' : 'Workflow board saved.',
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
        metadata,
        created_by: viewer.id,
      })
      .select('id')
      .single();

    if (insertResult.error || !insertResult.data) {
      throw new Error(insertResult.error?.message ?? 'Unable to create the workflow board.');
    }

    return NextResponse.json({
      id: insertResult.data.id,
      message: metadata.isTemplate ? 'Workflow template saved.' : 'Workflow board saved.',
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
