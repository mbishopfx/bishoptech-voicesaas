import { NextRequest, NextResponse } from 'next/server';
import { getViewerContext } from '@/lib/auth';
import { resolveVapiCredentialsForOrganization } from '@/lib/vapi-credentials';
import { createAssistant } from '@/lib/vapi';

/**
 * Admin endpoint to spin up assistants quickly from dashboard templates.
 * Extend with authz + tenant checks before production use.
 */
export async function POST(req: NextRequest) {
  try {
    const viewer = await getViewerContext();

    if (!viewer?.isPlatformAdmin) {
      return NextResponse.json({ ok: false, error: 'Only the platform admin can create assistants from this endpoint.' }, { status: 403 });
    }

    const body = await req.json();
    const payload = body.assistant ?? body.payload ?? body;
    const organizationId = typeof body.organizationId === 'string' && body.organizationId ? body.organizationId : undefined;
    const credentials = await resolveVapiCredentialsForOrganization(organizationId);
    const created = await createAssistant(payload, undefined, credentials.apiKey);
    return NextResponse.json({ ok: true, assistant: created });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
