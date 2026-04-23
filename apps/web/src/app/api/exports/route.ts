import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getDefaultOrganizationId, getViewerContext } from '@/lib/auth';
import { buildExportArtifact, canViewerAccessOrganization, recordExportJob } from '@/lib/voiceops-platform';

const exportSchema = z.object({
  organizationId: z.string().uuid().optional(),
  exportType: z.enum(['leads-csv', 'calls-json', 'tickets-json']),
});

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const viewer = await getViewerContext();

    if (!viewer) {
      return NextResponse.json({ error: 'You must be signed in to export workspace data.' }, { status: 401 });
    }

    const payload = exportSchema.parse(await request.json());
    const organizationId = payload.organizationId ?? getDefaultOrganizationId(viewer);

    if (!organizationId) {
      return NextResponse.json({ error: 'No organization is assigned to this account.' }, { status: 400 });
    }

    if (!canViewerAccessOrganization(viewer, organizationId)) {
      return NextResponse.json({ error: 'You do not have access to this workspace.' }, { status: 403 });
    }

    const artifact = await buildExportArtifact({
      organizationId,
      exportType: payload.exportType,
    });
    const exportJobId = await recordExportJob({
      organizationId,
      viewer,
      exportType: payload.exportType,
      fileName: artifact.fileName,
      mimeType: artifact.mimeType,
    });

    return NextResponse.json({
      ok: true,
      exportJobId,
      ...artifact,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to export workspace data.' },
      { status: 400 },
    );
  }
}
