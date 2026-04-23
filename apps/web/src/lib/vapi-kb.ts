import fs from 'node:fs/promises';
import path from 'node:path';

import { getSystemMessage, setSystemMessage } from '@/lib/assistant-config';
import { appConfig } from '@/lib/app-config';
import { createQueryTool, getAssistant, type VapiAssistantPayload, uploadVapiFile, updateAssistant } from '@/lib/vapi';

type SyncVapiKnowledgePackInput = {
  packDir: string;
  assistantId?: string;
  apiKey?: string;
  businessName?: string;
  knowledgeBaseName?: string;
  queryToolName?: string;
  queryToolDescription?: string;
  additionalFiles?: Array<{
    filePath: string;
    fileName?: string;
    assetId?: string;
    sourceType?: string;
    mimeType?: string;
  }>;
  replaceToolIds?: string[];
};

export type SyncVapiKnowledgePackResult = {
  packDir: string;
  businessName: string;
  uploadedFiles: Array<{
    filePath: string;
    fileName: string;
    fileId: string;
    assetId?: string;
    sourceType?: string;
    mimeType?: string;
  }>;
  queryToolId: string;
  queryToolName: string;
  assistantId?: string;
  assistantUpdated?: boolean;
};

function normalizePackName(input: string) {
  return input
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function isMarkdownFile(fileName: string) {
  return fileName.toLowerCase().endsWith('.md') && fileName.toLowerCase() !== 'manifest.md';
}

async function listMarkdownFiles(packDir: string) {
  const entries = await fs.readdir(packDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && isMarkdownFile(entry.name))
    .map((entry) => ({
      fileName: entry.name,
      filePath: path.join(packDir, entry.name),
    }))
    .sort((a, b) => a.fileName.localeCompare(b.fileName));
}

async function listKnowledgeFiles(
  packDir: string,
  additionalFiles: SyncVapiKnowledgePackInput['additionalFiles'] = [],
) {
  const markdownFiles = await listMarkdownFiles(packDir);
  const deduped = new Map<string, {
    filePath: string;
    fileName: string;
    assetId?: string;
    sourceType?: string;
    mimeType?: string;
  }>();

  for (const file of markdownFiles) {
    deduped.set(file.filePath, file);
  }

  for (const file of additionalFiles) {
    if (!file.filePath) {
      continue;
    }

    deduped.set(file.filePath, {
      filePath: file.filePath,
      fileName: file.fileName ?? path.basename(file.filePath),
      assetId: file.assetId,
      sourceType: file.sourceType,
      mimeType: file.mimeType,
    });
  }

  return [...deduped.values()].sort((a, b) => a.fileName.localeCompare(b.fileName));
}

function updateToolIds(payload: VapiAssistantPayload, toolId: string, replaceToolIds: string[] = []) {
  const existingToolIds = Array.isArray((payload.model as Record<string, unknown>).toolIds)
    ? ((payload.model as Record<string, unknown>).toolIds as string[])
    : [];
  const toolIds = [...new Set([...existingToolIds.filter((id) => !replaceToolIds.includes(id)), toolId])];

  return {
    ...payload,
    model: {
      ...payload.model,
      toolIds,
    },
  } satisfies VapiAssistantPayload;
}

function buildKnowledgeBaseDescription(businessName: string) {
  return `Markdown knowledge base for ${businessName}. Use it for services, hours, location, pricing, booking context, FAQs, and message-taking rules.`;
}

export async function syncVapiKnowledgePackToAssistant(input: SyncVapiKnowledgePackInput): Promise<SyncVapiKnowledgePackResult> {
  const resolvedApiKey = input.apiKey ?? appConfig.vapi.apiKey;

  if (!resolvedApiKey) {
    throw new Error('Missing Vapi API key.');
  }

  const packDir = path.resolve(input.packDir);
  const businessName = input.businessName ?? normalizePackName(path.basename(packDir));
  const knowledgeFiles = await listKnowledgeFiles(packDir, input.additionalFiles);

  if (!knowledgeFiles.length) {
    throw new Error(`No knowledge files found in ${packDir}.`);
  }

  const uploadedFiles = [];
  for (const file of knowledgeFiles) {
    const uploaded = await uploadVapiFile(file.filePath, resolvedApiKey);
    uploadedFiles.push({
      filePath: file.filePath,
      fileName: file.fileName,
      fileId: uploaded.id,
      assetId: file.assetId,
      sourceType: file.sourceType,
      mimeType: file.mimeType,
    });
  }

  const fileIds = uploadedFiles.map((file) => file.fileId);
  const queryToolName = input.queryToolName ?? `${path.basename(packDir)}-knowledge-search`;
  const knowledgeBaseName = input.knowledgeBaseName ?? `${businessName} knowledge base`;
  const queryToolDescription =
    input.queryToolDescription ?? buildKnowledgeBaseDescription(businessName);

  const queryTool = await createQueryTool(
    {
      type: 'query',
      function: {
        name: queryToolName,
        description: queryToolDescription,
      },
      knowledgeBases: [
        {
          provider: 'google',
          name: knowledgeBaseName,
          description: queryToolDescription,
          fileIds,
        },
      ],
    },
    `query-tool-${queryToolName}-${fileIds.join('-')}`,
    resolvedApiKey,
  );

  let assistantUpdated = false;

  if (input.assistantId) {
    const assistantRecord = await getAssistant(input.assistantId, resolvedApiKey);
    const { id: _id, orgId: _orgId, createdAt: _createdAt, updatedAt: _updatedAt, ...assistantPayload } = assistantRecord;
    const updatedPayload = updateToolIds(assistantPayload, queryTool.id, input.replaceToolIds);
    const currentSystemMessage = getSystemMessage(updatedPayload);
    const nextSystemMessage = currentSystemMessage.includes(queryToolName)
      ? currentSystemMessage
      : `${currentSystemMessage}\n\nUse the ${queryToolName} knowledge base tool when callers ask about business facts, services, hours, location, pricing, booking, or FAQs.`;
    const finalPayload = setSystemMessage(updatedPayload, nextSystemMessage);

    await updateAssistant(input.assistantId, finalPayload, `assistant-kb-${input.assistantId}-${queryTool.id}`, resolvedApiKey);
    assistantUpdated = true;
  }

  return {
    packDir,
    businessName,
    uploadedFiles,
    queryToolId: queryTool.id,
    queryToolName,
    assistantId: input.assistantId,
    assistantUpdated,
  };
}
