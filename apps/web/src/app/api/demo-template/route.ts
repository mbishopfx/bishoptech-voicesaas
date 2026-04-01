import { NextResponse } from 'next/server';
import { z } from 'zod';

import { canManageOrganization, getViewerContext } from '@/lib/auth';
import { generateDemoTemplate } from '@/lib/gemini';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

const demoTemplateRequestSchema = z.object({
  organizationId: z.string().uuid().optional(),
  businessName: z.string().optional(),
  websiteUrl: z.string().optional(),
  googleBusinessProfile: z.string().optional(),
  goal: z.string().optional(),
  targetPhoneNumber: z.string().optional(),
  notes: z.string().optional(),
  orchestrationMode: z.enum(['inbound', 'outbound', 'multi']).optional(),
});

export async function POST(request: Request) {
  try {
    const viewer = await getViewerContext();

    if (!viewer) {
      return NextResponse.json({ error: 'You must be signed in to generate a demo template.' }, { status: 401 });
    }

    const payload = demoTemplateRequestSchema.parse(await request.json());

    if (payload.organizationId && !canManageOrganization(viewer, payload.organizationId)) {
      return NextResponse.json({ error: 'You do not have permission to save demo templates for this organization.' }, { status: 403 });
    }

    const template = await generateDemoTemplate(payload);

    if (payload.organizationId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = getSupabaseAdminClient();
      const insertResult = await supabase
        .from('demo_blueprints')
        .insert({
          organization_id: payload.organizationId,
          title: template.assistantDraft.name,
          website_url: payload.websiteUrl,
          google_business_profile_raw_text: payload.googleBusinessProfile,
          generated_template: template,
          mermaid_flowchart: template.mermaidFlowchart,
          target_phone_number: payload.targetPhoneNumber,
          created_by: viewer.id,
        })
        .select('id')
        .single();

      if (!insertResult.error && insertResult.data) {
        template.persistedBlueprintId = insertResult.data.id;
      }
    }

    return NextResponse.json(template);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to generate demo template.',
      },
      { status: 400 },
    );
  }
}
