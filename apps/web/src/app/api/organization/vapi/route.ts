import { NextResponse } from 'next/server';
import { z } from 'zod';

import { canManageOrganization, getDefaultOrganizationId, getViewerContext } from '@/lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

const updateSchema = z.object({
  organizationId: z.string().uuid().optional(),
  accountMode: z.enum(['managed', 'byo']),
  apiKey: z.string().min(1).optional(),
  apiKeyLabel: z.string().min(1).optional(),
  apiKeyId: z.string().uuid().optional(),
});

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  vapi_account_mode?: 'managed' | 'byo' | null;
  vapi_api_key_id?: string | null;
  vapi_managed_label?: string | null;
};

type ApiKeyRow = {
  id: string;
  label: string;
  provider: string;
  organization_id: string;
  secret_value?: string;
};

async function loadOrganizationSettings(organizationId: string) {
  const supabase = getSupabaseAdminClient();
  const organizationResult = await supabase
    .from('organizations')
    .select('id, name, slug, vapi_account_mode, vapi_api_key_id, vapi_managed_label')
    .eq('id', organizationId)
    .maybeSingle();

  if (organizationResult.error || !organizationResult.data) {
    throw new Error(organizationResult.error?.message ?? 'Unable to load organization settings.');
  }

  const organization = organizationResult.data as OrganizationRow;
  const apiKeyResult = organization.vapi_api_key_id
    ? await supabase
        .from('api_keys')
        .select('id, label, provider, organization_id')
        .eq('id', organization.vapi_api_key_id)
        .eq('organization_id', organizationId)
        .maybeSingle()
    : { data: null, error: null };

  if (apiKeyResult.error) {
    throw new Error(apiKeyResult.error.message);
  }

  const apiKey = (apiKeyResult.data as ApiKeyRow | null) ?? null;

  return {
    organizationId: organization.id,
    organizationName: organization.name,
    organizationSlug: organization.slug,
    accountMode: organization.vapi_account_mode === 'byo' ? 'byo' : 'managed',
    vapiManagedLabel: organization.vapi_managed_label ?? 'Managed by BishopTech',
    vapiApiKeyId: organization.vapi_api_key_id ?? null,
    vapiApiKeyLabel: apiKey?.provider === 'vapi' ? apiKey.label : null,
    credentialMode: organization.vapi_account_mode === 'byo' && organization.vapi_api_key_id ? 'byo' : 'managed',
  };
}

function resolveOrganizationId(request: Request, viewerDefaultOrganizationId: string | null) {
  const url = new URL(request.url);
  return url.searchParams.get('organizationId') ?? viewerDefaultOrganizationId;
}

export async function GET(request: Request) {
  try {
    const viewer = await getViewerContext();

    if (!viewer) {
      return NextResponse.json({ error: 'You must be signed in to view workspace settings.' }, { status: 401 });
    }

    const organizationId = resolveOrganizationId(request, getDefaultOrganizationId(viewer));

    if (!organizationId) {
      return NextResponse.json({ error: 'No organization is assigned to this account.' }, { status: 400 });
    }

    const hasAccess = viewer.isPlatformAdmin || viewer.memberships.some((item) => item.organizationId === organizationId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'You do not have access to this workspace.' }, { status: 403 });
    }

    const settings = await loadOrganizationSettings(organizationId);

    return NextResponse.json({
      ...settings,
      canEdit: canManageOrganization(viewer, organizationId),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to load workspace settings.',
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const viewer = await getViewerContext();

    if (!viewer) {
      return NextResponse.json({ error: 'You must be signed in to manage workspace settings.' }, { status: 401 });
    }

    const payload = updateSchema.parse(await request.json());
    const organizationId = payload.organizationId ?? getDefaultOrganizationId(viewer);

    if (!organizationId) {
      return NextResponse.json({ error: 'No organization is assigned to this account.' }, { status: 400 });
    }

    if (!canManageOrganization(viewer, organizationId)) {
      return NextResponse.json({ error: 'You do not have permission to edit this workspace.' }, { status: 403 });
    }

    const supabase = getSupabaseAdminClient();
    const organization = await loadOrganizationSettings(organizationId);

    if (payload.accountMode === 'managed') {
      const updateResult = await supabase
        .from('organizations')
        .update({
          vapi_account_mode: 'managed',
          vapi_api_key_id: null,
          vapi_managed_label: organization.vapiManagedLabel ?? 'Managed by BishopTech',
        })
        .eq('id', organizationId);

      if (updateResult.error) {
        throw new Error(updateResult.error.message);
      }

      const updated = await loadOrganizationSettings(organizationId);

      return NextResponse.json({
        ...updated,
        message: 'Managed Vapi mode is active.',
      });
    }

    const apiKeyValue = payload.apiKey?.trim();
    const apiKeyLabel = payload.apiKeyLabel?.trim();

    let apiKeyId = organization.vapiApiKeyId ?? null;

    if (apiKeyValue) {
      if (apiKeyId) {
        const updateKeyResult = await supabase
          .from('api_keys')
          .update({
            secret_value: apiKeyValue,
            label: apiKeyLabel ?? organization.vapiApiKeyLabel ?? `${organization.organizationName} Vapi key`,
            updated_by: viewer.id,
          })
          .eq('id', apiKeyId)
          .eq('organization_id', organizationId);

        if (updateKeyResult.error) {
          throw new Error(updateKeyResult.error.message);
        }
      } else {
        const insertResult = await supabase
          .from('api_keys')
          .insert({
            organization_id: organizationId,
            provider: 'vapi',
            label: apiKeyLabel ?? `${organization.organizationName} Vapi key`,
            secret_value: apiKeyValue,
            is_default: true,
            created_by: viewer.id,
            updated_by: viewer.id,
            metadata: {
              source: 'workspace-settings',
            },
          })
          .select('id')
          .single();

        if (insertResult.error || !insertResult.data) {
          throw new Error(insertResult.error?.message ?? 'Unable to save the BYO Vapi key.');
        }

        apiKeyId = insertResult.data.id as string;
      }
    } else if (payload.apiKeyId && !apiKeyId) {
      const attachResult = await supabase
        .from('api_keys')
        .select('id, provider')
        .eq('id', payload.apiKeyId)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (attachResult.error || !attachResult.data || attachResult.data.provider !== 'vapi') {
        throw new Error('The selected BYO Vapi key could not be reattached.');
      }

      apiKeyId = attachResult.data.id as string;
    } else if (!apiKeyId) {
      return NextResponse.json({ error: 'Enter a Vapi API key to enable BYO mode.' }, { status: 400 });
    }

    const updateResult = await supabase
      .from('organizations')
      .update({
        vapi_account_mode: 'byo',
        vapi_api_key_id: apiKeyId,
        vapi_managed_label: organization.vapiManagedLabel ?? 'Managed by BishopTech',
      })
      .eq('id', organizationId);

    if (updateResult.error) {
      throw new Error(updateResult.error.message);
    }

    const updated = await loadOrganizationSettings(organizationId);

    return NextResponse.json({
      ...updated,
      message: 'BYO Vapi mode saved.',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to update workspace settings.',
      },
      { status: 400 },
    );
  }
}
