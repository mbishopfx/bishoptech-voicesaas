import { appConfig } from '@/lib/app-config';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export type ResolvedVapiCredentials = {
  organizationId?: string;
  mode: 'managed' | 'byo';
  source: 'env' | 'organization';
  apiKey: string;
  apiKeyId?: string;
  label?: string;
};

type OrganizationVapiRow = {
  id: string;
  vapi_account_mode?: 'managed' | 'byo' | null;
  vapi_api_key_id?: string | null;
};

type VapiApiKeyRow = {
  id: string;
  organization_id: string;
  label: string;
  secret_value: string;
  provider: string;
};

export async function resolveVapiCredentialsForOrganization(organizationId?: string | null): Promise<ResolvedVapiCredentials> {
  if (!organizationId) {
    if (!appConfig.vapi.apiKey) {
      throw new Error('Missing managed Vapi credentials.');
    }

    return {
      mode: 'managed',
      source: 'env',
      apiKey: appConfig.vapi.apiKey,
    };
  }

  const supabase = getSupabaseAdminClient();
  const organizationResult = await supabase
    .from('organizations')
    .select('id, vapi_account_mode, vapi_api_key_id')
    .eq('id', organizationId)
    .maybeSingle();

  if (organizationResult.error || !organizationResult.data) {
    if (!appConfig.vapi.apiKey) {
      throw new Error('Unable to resolve Vapi credentials for this organization.');
    }

    return {
      organizationId,
      mode: 'managed',
      source: 'env',
      apiKey: appConfig.vapi.apiKey,
    };
  }

  const organization = organizationResult.data as OrganizationVapiRow;
  const accountMode = organization.vapi_account_mode === 'byo' ? 'byo' : 'managed';

  if (accountMode === 'managed') {
    if (!appConfig.vapi.apiKey) {
      throw new Error('Managed Vapi credentials are not configured.');
    }

    return {
      organizationId,
      mode: 'managed',
      source: 'env',
      apiKey: appConfig.vapi.apiKey,
    };
  }

  if (!organization.vapi_api_key_id) {
    throw new Error('This organization is marked as BYO Vapi but no API key is attached.');
  }

  const keyResult = await supabase
    .from('api_keys')
    .select('id, organization_id, label, secret_value, provider')
    .eq('id', organization.vapi_api_key_id)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (keyResult.error || !keyResult.data) {
    throw new Error(keyResult.error?.message ?? 'Unable to load the organization Vapi key.');
  }

  const apiKeyRow = keyResult.data as VapiApiKeyRow;

  if (apiKeyRow.provider !== 'vapi') {
    throw new Error('The selected API key is not a Vapi credential.');
  }

  return {
    organizationId,
    mode: 'byo',
    source: 'organization',
    apiKey: apiKeyRow.secret_value,
    apiKeyId: apiKeyRow.id,
    label: apiKeyRow.label,
  };
}
