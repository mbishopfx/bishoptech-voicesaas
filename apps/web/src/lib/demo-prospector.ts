import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { appConfig } from '@/lib/app-config';
import { buildVapiAssistantPayload } from '@/lib/demo-template';
import { generateDemoTemplate } from '@/lib/gemini';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import type { DemoCallResult, DemoProspectorResult, DemoTemplateInput, DemoTemplateResult, KnowledgeAsset } from '@/lib/types';
import { createAssistant, createOutboundCall, updateAssistant } from '@/lib/vapi';
import { syncVapiKnowledgePackToAssistant } from '@/lib/vapi-kb';
import { resolveVapiCredentialsForOrganization } from '@/lib/vapi-credentials';
import { importAssistantToWorkspace } from '@/lib/voiceops-platform';

const execFileAsync = promisify(execFile);

const allowedUploadExtensions = new Set(['.pdf', '.docx', '.txt', '.md']);
const managedByLabel = 'voiceops-assistant-factory';

type DemoBlueprintRow = {
  id: string;
  organization_id: string;
  title: string;
  website_url?: string | null;
  google_business_profile_raw_text?: string | null;
  generated_template?: DemoTemplateResult | null;
  mermaid_flowchart?: string | null;
  target_phone_number?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  local_agent_id?: string | null;
  status?: string | null;
  pack_dir?: string | null;
  knowledge_pack_slug?: string | null;
  query_tool_id?: string | null;
  vapi_assistant_id?: string | null;
  kb_sync_status?: string | null;
  kb_sync_error?: string | null;
  source_inputs?: Record<string, unknown> | null;
  embed_snippet?: string | null;
  last_test_call_id?: string | null;
  last_test_call_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

type DemoBlueprintAssetRow = {
  id: string;
  demo_blueprint_id: string;
  organization_id: string;
  asset_type: string;
  source_label: string;
  source_url?: string | null;
  file_name?: string | null;
  file_ext?: string | null;
  mime_type?: string | null;
  storage_path?: string | null;
  byte_size?: number | null;
  vapi_file_id?: string | null;
  sync_status?: string | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
};

type PersistedUpload = {
  originalName: string;
  fileName: string;
  extension: string;
  mimeType: string;
  byteSize: number;
  storagePath: string;
};

type DemoUploadFile = {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
};

type RunDemoProspectorInput = DemoTemplateInput & {
  organizationId: string;
  viewerId: string;
  persistedBlueprintId?: string;
  files?: DemoUploadFile[];
};

type SyncDemoBlueprintInput = {
  demoBlueprintId: string;
};

type LaunchDemoCallInput = {
  demoBlueprintId?: string;
  organizationId?: string;
  assistantId?: string;
  targetPhoneNumber: string;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function toObject(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizePhoneNumber(input: string) {
  const digits = input.replace(/[^\d+]/g, '');

  if (digits.startsWith('+')) {
    return digits;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  return digits;
}

function safeFileName(input: string) {
  return input.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-');
}

function classifyPackAsset(fileName: string): DemoBlueprintAssetRow['asset_type'] {
  if (fileName.startsWith('page-')) {
    return 'website-page';
  }

  if (fileName.includes('google-business-profile')) {
    return 'google-business-profile';
  }

  if (fileName.includes('goal') || fileName.includes('notes')) {
    return 'goal-notes';
  }

  return 'generated-pack';
}

function normalizeKnowledgeAsset(row: DemoBlueprintAssetRow): KnowledgeAsset {
  return {
    id: row.id,
    demoBlueprintId: row.demo_blueprint_id,
    assetType: row.asset_type as KnowledgeAsset['assetType'],
    sourceLabel: row.source_label,
    sourceUrl: row.source_url ?? undefined,
    fileName: row.file_name ?? undefined,
    fileExt: row.file_ext ?? undefined,
    mimeType: row.mime_type ?? undefined,
    storagePath: row.storage_path ?? undefined,
    byteSize: row.byte_size ?? undefined,
    vapiFileId: row.vapi_file_id ?? undefined,
    syncStatus: (row.sync_status as KnowledgeAsset['syncStatus']) ?? 'pending',
    createdAt: row.created_at,
    metadata: toObject(row.metadata),
  };
}

export function buildDemoEmbedSnippet(assistantId: string) {
  const publicKey = appConfig.vapi.publicKey ?? 'YOUR_VAPI_PUBLIC_KEY';

  return [
    '<script src="https://unpkg.com/@vapi-ai/client-sdk-react/dist/embed/widget.umd.js" async type="text/javascript"></script>',
    `<vapi-widget public-key="${publicKey}" assistant-id="${assistantId}" mode="voice" theme="light" position="bottom-right" size="compact"></vapi-widget>`,
  ].join('\n');
}

function buildPackRoot(blueprintId: string) {
  return path.join(process.cwd(), 'generated', 'vapi-kb', 'prospector', blueprintId);
}

function buildUploadRoot(blueprintId: string) {
  return path.join(process.cwd(), 'generated', 'demo-prospector', blueprintId, 'uploads');
}

async function writeTextFile(filePath: string, content: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
}

async function buildWebsiteKnowledgePack(input: {
  blueprintId: string;
  websiteUrl?: string;
  businessName: string;
}) {
  const packRoot = buildPackRoot(input.blueprintId);
  await fs.rm(packRoot, { recursive: true, force: true });
  await fs.mkdir(packRoot, { recursive: true });

  if (!input.websiteUrl) {
    const packDir = path.join(packRoot, slugify(input.businessName || `demo-${input.blueprintId.slice(0, 8)}`));
    await fs.mkdir(packDir, { recursive: true });
    return packDir;
  }

  const scriptPath = path.join(process.cwd(), 'scripts', 'build-vapi-kb-pack.mjs');
  const { stdout } = await execFileAsync(process.execPath, [scriptPath, '--url', input.websiteUrl, '--output', packRoot, '--max-pages', '8'], {
    cwd: process.cwd(),
    maxBuffer: 8 * 1024 * 1024,
  });
  const outputLine = stdout
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('Output:'));

  if (!outputLine) {
    throw new Error('KB pack builder did not return an output directory.');
  }

  const packDir = outputLine.replace(/^Output:\s*/, '').trim();
  return path.resolve(packDir);
}

function buildOverviewMarkdown(template: DemoTemplateResult, input: DemoTemplateInput) {
  return [
    `# ${template.businessContext.businessName} Demo Overview`,
    '',
    '## Business context',
    `- Vertical: ${template.businessContext.vertical}`,
    `- Target caller: ${template.businessContext.targetCaller}`,
    `- Website: ${input.websiteUrl || 'Not provided'}`,
    '',
    '## Demo objective',
    `- ${input.goal || 'Show a believable voice assistant that can answer questions, qualify leads, and route the next step.'}`,
    '',
    '## Source-grounded operating notes',
    `- ${template.businessContext.summary}`,
    '- Use the crawled website pages and attached files as the source of truth for business facts.',
    '- If a detail is missing or uncertain, the assistant should take a message or promise a callback instead of guessing.',
  ].join('\n');
}

function buildAssistantPromptMarkdown(template: DemoTemplateResult, input: DemoTemplateInput) {
  return [
    `# ${template.assistantDraft.name} Prompt`,
    '',
    '## First message',
    template.assistantDraft.firstMessage,
    '',
    '## System prompt',
    template.assistantDraft.systemPrompt,
    '',
    '## Demo constraints',
    '- Keep phrasing conversational and short enough for live voice.',
    '- Use the query tool when the caller asks about business-specific facts, services, hours, availability, policies, or uploaded documents.',
    '- If the knowledge base does not confirm the answer, collect the lead and hand off cleanly.',
    input.notes ? `- Operator note: ${input.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildBookingMarkdown(template: DemoTemplateResult) {
  return [
    '# Booking and Handoff Rules',
    '',
    '## Lead capture fields',
    ...template.assistantDraft.leadCaptureFields.map((field) => `- ${field}`),
    '',
    '## Qualification checklist',
    ...template.assistantDraft.qualificationChecklist.map((field) => `- ${field}`),
    '',
    '## Success criteria',
    ...template.assistantDraft.successCriteria.map((field) => `- ${field}`),
  ].join('\n');
}

function buildFaqMarkdown(template: DemoTemplateResult) {
  return [
    '# FAQ and Objections',
    '',
    '## FAQ snippets',
    ...template.assistantDraft.faqSnippets.map((item) => `- ${item}`),
    '',
    '## Objection handling',
    ...template.assistantDraft.objectionHandling.map((item) => `- ${item}`),
  ].join('\n');
}

function buildTestScenariosMarkdown(template: DemoTemplateResult) {
  return [
    '# Test Scenarios',
    '',
    ...template.assistantDraft.successCriteria.map((item, index) => `${index + 1}. ${item}`),
  ].join('\n');
}

async function writeSupplementalKnowledgeFiles(packDir: string, template: DemoTemplateResult, input: DemoTemplateInput) {
  await writeTextFile(path.join(packDir, '00-business-overview.md'), buildOverviewMarkdown(template, input));
  await writeTextFile(path.join(packDir, '01-assistant-prompt.md'), buildAssistantPromptMarkdown(template, input));
  await writeTextFile(path.join(packDir, '02-booking-and-handoff.md'), buildBookingMarkdown(template));
  await writeTextFile(path.join(packDir, '03-faq.md'), buildFaqMarkdown(template));
  await writeTextFile(path.join(packDir, '04-test-scenarios.md'), buildTestScenariosMarkdown(template));

  if (input.googleBusinessProfile?.trim()) {
    await writeTextFile(
      path.join(packDir, '05-google-business-profile.md'),
      ['# Google Business Profile Notes', '', input.googleBusinessProfile.trim()].join('\n'),
    );
  }

  if (input.goal?.trim()) {
    await writeTextFile(path.join(packDir, '06-demo-goal.md'), ['# Demo Goal', '', input.goal.trim()].join('\n'));
  }

  if (input.notes?.trim()) {
    await writeTextFile(path.join(packDir, '07-operator-notes.md'), ['# Operator Notes', '', input.notes.trim()].join('\n'));
  }
}

async function listPackAssetEntries(packDir: string, blueprintId: string, organizationId: string, websiteUrl?: string) {
  const entries = await fs.readdir(packDir, { withFileTypes: true });
  const rows: Array<Omit<DemoBlueprintAssetRow, 'id' | 'created_at'>> = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const absolutePath = path.join(packDir, entry.name);
    const stats = await fs.stat(absolutePath);
    rows.push({
      demo_blueprint_id: blueprintId,
      organization_id: organizationId,
      asset_type: classifyPackAsset(entry.name),
      source_label: entry.name,
      source_url: entry.name.startsWith('page-') ? websiteUrl ?? null : null,
      file_name: entry.name,
      file_ext: path.extname(entry.name).toLowerCase(),
      mime_type: 'text/markdown',
      storage_path: absolutePath,
      byte_size: stats.size,
      vapi_file_id: null,
      sync_status: 'pending',
      metadata: {},
    });
  }

  return rows;
}

async function persistOperatorUploads(blueprintId: string, files: DemoUploadFile[]) {
  const uploadRoot = buildUploadRoot(blueprintId);
  await fs.mkdir(uploadRoot, { recursive: true });

  const persisted: PersistedUpload[] = [];

  for (const file of files) {
    const extension = path.extname(file.name).toLowerCase();

    if (!allowedUploadExtensions.has(extension)) {
      throw new Error(`Unsupported upload type for ${file.name}. Accepted files: pdf, docx, txt, md.`);
    }

    const fileName = `${Date.now()}-${safeFileName(file.name)}`;
    const storagePath = path.join(uploadRoot, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(storagePath, buffer);

    persisted.push({
      originalName: file.name,
      fileName,
      extension,
      mimeType: file.type || 'application/octet-stream',
      byteSize: file.size || buffer.byteLength,
      storagePath,
    });
  }

  return persisted;
}

async function findExistingBlueprint(
  organizationId: string,
  title: string,
  input: DemoTemplateInput,
  persistedBlueprintId?: string,
) {
  const supabase = getSupabaseAdminClient();

  if (persistedBlueprintId) {
    const existing = await supabase
      .from('demo_blueprints')
      .select('*')
      .eq('id', persistedBlueprintId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (existing.data) {
      return existing.data as DemoBlueprintRow;
    }
  }

  if (input.websiteUrl?.trim()) {
    const existing = await supabase
      .from('demo_blueprints')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('website_url', input.websiteUrl.trim())
      .order('updated_at', { ascending: false })
      .limit(1);

    if ((existing.data ?? [])[0]) {
      return existing.data?.[0] as DemoBlueprintRow;
    }
  }

  const existing = await supabase
    .from('demo_blueprints')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('title', title)
    .order('updated_at', { ascending: false })
    .limit(1);

  return ((existing.data ?? [])[0] as DemoBlueprintRow | undefined) ?? null;
}

async function upsertBlueprint(input: {
  organizationId: string;
  viewerId: string;
  template: DemoTemplateResult;
  form: DemoTemplateInput;
  persistedBlueprintId?: string;
}) {
  const supabase = getSupabaseAdminClient();
  const existing = await findExistingBlueprint(
    input.organizationId,
    input.template.assistantDraft.name,
    input.form,
    input.persistedBlueprintId,
  );
  const payload = {
    organization_id: input.organizationId,
    title: input.template.assistantDraft.name,
    website_url: input.form.websiteUrl?.trim() || null,
    google_business_profile_raw_text: input.form.googleBusinessProfile?.trim() || null,
    generated_template: input.template,
    mermaid_flowchart: input.template.mermaidFlowchart,
    target_phone_number: input.form.targetPhoneNumber?.trim() || null,
    created_by: input.viewerId,
    status: 'building',
    kb_sync_status: 'building',
    kb_sync_error: null,
    source_inputs: {
      businessName: input.form.businessName ?? input.template.businessContext.businessName,
      websiteUrl: input.form.websiteUrl ?? null,
      googleBusinessProfile: input.form.googleBusinessProfile ?? null,
      goal: input.form.goal ?? null,
      notes: input.form.notes ?? null,
      orchestrationMode: input.form.orchestrationMode ?? input.template.orchestrationMode,
    },
  };

  if (existing) {
    const result = await supabase
      .from('demo_blueprints')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single();

    if (result.error || !result.data) {
      throw new Error(result.error?.message ?? 'Unable to update the demo blueprint.');
    }

    return result.data as DemoBlueprintRow;
  }

  const result = await supabase
    .from('demo_blueprints')
    .insert(payload)
    .select('*')
    .single();

  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? 'Unable to persist the demo blueprint.');
  }

  return result.data as DemoBlueprintRow;
}

async function replaceGeneratedAssets(blueprint: DemoBlueprintRow, packAssets: Array<Omit<DemoBlueprintAssetRow, 'id' | 'created_at'>>) {
  const supabase = getSupabaseAdminClient();
  await supabase.from('demo_blueprint_assets').delete().eq('demo_blueprint_id', blueprint.id).neq('asset_type', 'operator-file');

  if (!packAssets.length) {
    return [] as DemoBlueprintAssetRow[];
  }

  const result = await supabase.from('demo_blueprint_assets').insert(packAssets).select('*');

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []) as DemoBlueprintAssetRow[];
}

async function replaceOperatorAssets(blueprint: DemoBlueprintRow, uploads: PersistedUpload[]) {
  const supabase = getSupabaseAdminClient();

  if (!uploads.length) {
    const existing = await supabase
      .from('demo_blueprint_assets')
      .select('*')
      .eq('demo_blueprint_id', blueprint.id)
      .eq('asset_type', 'operator-file')
      .order('created_at', { ascending: true });

    return (existing.data ?? []) as DemoBlueprintAssetRow[];
  }

  await supabase.from('demo_blueprint_assets').delete().eq('demo_blueprint_id', blueprint.id).eq('asset_type', 'operator-file');

  const result = await supabase
    .from('demo_blueprint_assets')
    .insert(
      uploads.map((upload) => ({
        organization_id: blueprint.organization_id,
        demo_blueprint_id: blueprint.id,
        asset_type: 'operator-file',
        source_label: upload.originalName,
        source_url: null,
        file_name: upload.fileName,
        file_ext: upload.extension,
        mime_type: upload.mimeType,
        storage_path: upload.storagePath,
        byte_size: upload.byteSize,
        sync_status: 'pending',
        metadata: {
          originalName: upload.originalName,
        },
      })),
    )
    .select('*');

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []) as DemoBlueprintAssetRow[];
}

async function markAssetSyncState(
  blueprintId: string,
  uploadedFiles: Array<{ filePath: string; fileId: string }>,
) {
  const supabase = getSupabaseAdminClient();
  const updates = uploadedFiles.map((file) =>
    supabase
      .from('demo_blueprint_assets')
      .update({
        vapi_file_id: file.fileId,
        sync_status: 'synced',
      })
      .eq('demo_blueprint_id', blueprintId)
      .eq('storage_path', file.filePath),
  );
  await Promise.all(updates);
}

async function loadBlueprintById(blueprintId: string) {
  const supabase = getSupabaseAdminClient();
  const result = await supabase.from('demo_blueprints').select('*').eq('id', blueprintId).maybeSingle();

  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? 'Demo blueprint not found.');
  }

  return result.data as DemoBlueprintRow;
}

async function loadBlueprintAssets(blueprintId: string) {
  const supabase = getSupabaseAdminClient();
  const result = await supabase
    .from('demo_blueprint_assets')
    .select('*')
    .eq('demo_blueprint_id', blueprintId)
    .order('created_at', { ascending: true });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []) as DemoBlueprintAssetRow[];
}

async function createOrUpdateAssistant(input: {
  blueprint: DemoBlueprintRow;
  template: DemoTemplateResult;
  organizationId: string;
  knowledgePackSlug: string;
}) {
  const credentials = await resolveVapiCredentialsForOrganization(input.organizationId);
  const metadata = {
    organizationId: input.organizationId,
    demoBlueprintId: input.blueprint.id,
    knowledgePackSlug: input.knowledgePackSlug,
    orchestrationMode: input.template.orchestrationMode,
    managedBy: managedByLabel,
  };

  const payload = buildVapiAssistantPayload(input.template, { metadata });

  if (input.blueprint.vapi_assistant_id) {
    await updateAssistant(
      input.blueprint.vapi_assistant_id,
      payload,
      `demo-blueprint-${input.blueprint.id}-${Date.now()}`,
      credentials.apiKey,
    );

    return {
      assistantId: input.blueprint.vapi_assistant_id,
      credentials,
    };
  }

  const created = await createAssistant(payload, `demo-blueprint-${input.blueprint.id}`, credentials.apiKey);
  return {
    assistantId: created.id,
    credentials,
  };
}

function hydrateProspectorResult(
  blueprint: DemoBlueprintRow,
  template: DemoTemplateResult,
  assets: DemoBlueprintAssetRow[],
): DemoProspectorResult {
  return {
    ...template,
    persistedBlueprintId: blueprint.id,
    status: (blueprint.status as DemoProspectorResult['status']) ?? 'draft',
    knowledgePackSlug: blueprint.knowledge_pack_slug ?? undefined,
    packDir: blueprint.pack_dir ?? undefined,
    queryToolId: blueprint.query_tool_id ?? undefined,
    vapiAssistantId: blueprint.vapi_assistant_id ?? undefined,
    uploadedAssets: assets.map(normalizeKnowledgeAsset),
    lastTestCallId: blueprint.last_test_call_id ?? undefined,
    lastTestCallAt: blueprint.last_test_call_at ?? undefined,
    embedSnippet: blueprint.embed_snippet ?? undefined,
    kbSyncStatus: (blueprint.kb_sync_status as DemoProspectorResult['kbSyncStatus']) ?? 'pending',
  };
}

async function updateBlueprintState(
  blueprintId: string,
  patch: Partial<DemoBlueprintRow>,
) {
  const supabase = getSupabaseAdminClient();
  await supabase.from('demo_blueprints').update(patch).eq('id', blueprintId);
}

export async function runDemoProspector(input: RunDemoProspectorInput): Promise<DemoProspectorResult> {
  let blueprint: DemoBlueprintRow | null = null;

  try {
    const template = await generateDemoTemplate(input);
    blueprint = await upsertBlueprint({
      organizationId: input.organizationId,
      viewerId: input.viewerId,
      template,
      form: input,
      persistedBlueprintId: input.persistedBlueprintId,
    });

    const packDir = await buildWebsiteKnowledgePack({
      blueprintId: blueprint.id,
      websiteUrl: input.websiteUrl?.trim() || undefined,
      businessName: template.businessContext.businessName,
    });
    await writeSupplementalKnowledgeFiles(packDir, template, input);

    const uploads = await persistOperatorUploads(blueprint.id, input.files ?? []);
    const [generatedAssets, operatorAssets] = await Promise.all([
      listPackAssetEntries(packDir, blueprint.id, blueprint.organization_id, input.websiteUrl?.trim() || undefined).then((assets) =>
        replaceGeneratedAssets(blueprint as DemoBlueprintRow, assets),
      ),
      replaceOperatorAssets(blueprint, uploads),
    ]);

    const knowledgePackSlug = path.basename(packDir);
    const assistantResult = await createOrUpdateAssistant({
      blueprint,
      template,
      organizationId: input.organizationId,
      knowledgePackSlug,
    });
    const syncResult = await syncVapiKnowledgePackToAssistant({
      packDir,
      assistantId: assistantResult.assistantId,
      apiKey: assistantResult.credentials.apiKey,
      businessName: template.businessContext.businessName,
      queryToolName: `${slugify(template.businessContext.businessName)}-knowledge-search`,
      additionalFiles: operatorAssets
        .filter((asset) => asset.storage_path)
        .map((asset) => ({
          filePath: asset.storage_path as string,
          fileName: asset.metadata?.originalName ? String(asset.metadata.originalName) : asset.file_name ?? undefined,
          assetId: asset.id,
          sourceType: asset.asset_type,
          mimeType: asset.mime_type ?? undefined,
        })),
      replaceToolIds: blueprint.query_tool_id ? [blueprint.query_tool_id] : [],
    });

    await markAssetSyncState(blueprint.id, syncResult.uploadedFiles);

    const importResult = await importAssistantToWorkspace({
      assistantId: assistantResult.assistantId,
      organizationId: input.organizationId,
      mode: 'attach',
    });
    const embedSnippet = buildDemoEmbedSnippet(assistantResult.assistantId);
    const finalTemplate: DemoTemplateResult = {
      ...template,
      persistedBlueprintId: blueprint.id,
      status: 'assistant_ready',
      knowledgePackSlug,
      packDir,
      queryToolId: syncResult.queryToolId,
      vapiAssistantId: assistantResult.assistantId,
      uploadedAssets: [...generatedAssets, ...operatorAssets].map(normalizeKnowledgeAsset),
      embedSnippet,
      kbSyncStatus: 'synced',
    };

    await updateBlueprintState(blueprint.id, {
      generated_template: finalTemplate,
      status: 'assistant_ready',
      pack_dir: packDir,
      knowledge_pack_slug: knowledgePackSlug,
      query_tool_id: syncResult.queryToolId,
      vapi_assistant_id: assistantResult.assistantId,
      local_agent_id: importResult.localAgentId,
      kb_sync_status: 'synced',
      kb_sync_error: null,
      embed_snippet: embedSnippet,
      metadata: {
        managedBy: managedByLabel,
        assistantImported: Boolean(importResult.localAgentId),
      },
    });

    const hydratedBlueprint = await loadBlueprintById(blueprint.id);
    const hydratedAssets = await loadBlueprintAssets(blueprint.id);
    return hydrateProspectorResult(hydratedBlueprint, finalTemplate, hydratedAssets);
  } catch (error) {
    if (blueprint) {
      await updateBlueprintState(blueprint.id, {
        status: 'failed',
        kb_sync_status: 'failed',
        kb_sync_error: error instanceof Error ? error.message : 'Unknown demo prospector failure.',
      });
    }

    throw error;
  }
}

export async function syncDemoBlueprintKnowledgeBase(input: SyncDemoBlueprintInput) {
  const blueprint = await loadBlueprintById(input.demoBlueprintId);

  if (!blueprint.pack_dir) {
    throw new Error('This demo blueprint does not have a knowledge pack directory yet.');
  }

  const assets = await loadBlueprintAssets(blueprint.id);
  const operatorAssets = assets.filter((asset) => asset.asset_type === 'operator-file' && asset.storage_path);
  const credentials = await resolveVapiCredentialsForOrganization(blueprint.organization_id);

  const result = await syncVapiKnowledgePackToAssistant({
    packDir: blueprint.pack_dir,
    assistantId: blueprint.vapi_assistant_id ?? undefined,
    apiKey: credentials.apiKey,
    businessName: blueprint.title,
    additionalFiles: operatorAssets.map((asset) => ({
      filePath: asset.storage_path as string,
      fileName: asset.metadata?.originalName ? String(asset.metadata.originalName) : asset.file_name ?? undefined,
      assetId: asset.id,
      sourceType: asset.asset_type,
      mimeType: asset.mime_type ?? undefined,
    })),
    replaceToolIds: blueprint.query_tool_id ? [blueprint.query_tool_id] : [],
  });

  await markAssetSyncState(blueprint.id, result.uploadedFiles);
  await updateBlueprintState(blueprint.id, {
    status: blueprint.vapi_assistant_id ? 'assistant_ready' : 'kb_ready',
    kb_sync_status: 'synced',
    kb_sync_error: null,
    query_tool_id: result.queryToolId,
  });

  return {
    blueprintId: blueprint.id,
    queryToolId: result.queryToolId,
    assistantId: blueprint.vapi_assistant_id ?? undefined,
  };
}

export async function launchDemoProspectorCall(input: LaunchDemoCallInput): Promise<DemoCallResult> {
  const blueprint = input.demoBlueprintId ? await loadBlueprintById(input.demoBlueprintId) : null;
  const organizationId = blueprint?.organization_id ?? input.organizationId;
  const assistantId = blueprint?.vapi_assistant_id ?? input.assistantId;

  if (!assistantId) {
    throw new Error('No persisted Vapi assistant is attached to this demo yet.');
  }

  const phoneNumberId = appConfig.vapi.demoPhoneNumberId;

  if (!phoneNumberId) {
    throw new Error('Live demo calling requires VAPI_DEMO_PHONE_NUMBER_ID.');
  }

  const normalizedPhone = normalizePhoneNumber(input.targetPhoneNumber);
  const credentials = await resolveVapiCredentialsForOrganization(organizationId);
  const call = await createOutboundCall(
    {
      assistantId,
      phoneNumberId,
      customer: {
        number: normalizedPhone,
      },
    },
    `demo-prospector-call-${assistantId}-${normalizedPhone}`,
    credentials.apiKey,
  );

  if (blueprint) {
    await updateBlueprintState(blueprint.id, {
      status: 'test_called',
      last_test_call_id: call.id,
      last_test_call_at: new Date().toISOString(),
    });
  }

  return {
    mode: 'live',
    message: `Assistant ${assistantId} was reused and the demo call was launched to ${normalizedPhone}.`,
    assistantId,
    callId: call.id,
    phoneNumberId,
    warnings: [],
  };
}
