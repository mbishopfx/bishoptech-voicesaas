import type { BlastCsvPreview, BlastRecipient } from '@/lib/types';

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

export function normalizePhoneNumber(input: string) {
  const stripped = input.replace(/[^\d+]/g, '');

  if (!stripped) {
    return null;
  }

  if (stripped.startsWith('+')) {
    return stripped.length >= 11 ? stripped : null;
  }

  if (stripped.length === 10) {
    return `+1${stripped}`;
  }

  if (stripped.length === 11 && stripped.startsWith('1')) {
    return `+${stripped}`;
  }

  return stripped.length >= 11 ? `+${stripped}` : null;
}

function findColumnIndex(headers: string[], matcher: RegExp) {
  return headers.findIndex((header) => matcher.test(header));
}

export function parseBlastCsv(csvText: string): BlastCsvPreview {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return {
      validRecipients: [],
      rejectedRows: [],
    };
  }

  const firstRow = parseCsvLine(lines[0]);
  const headerCells = firstRow.map((cell) => cell.toLowerCase());
  const hasHeader = headerCells.some((cell) => /(phone|number|mobile|telephone|cell|name|contact|customer)/.test(cell));
  const phoneIndex = hasHeader ? findColumnIndex(headerCells, /(phone|number|mobile|telephone|cell)/) : -1;
  const nameIndex = hasHeader ? findColumnIndex(headerCells, /(name|contact|customer)/) : -1;

  const preview: BlastCsvPreview = {
    validRecipients: [],
    rejectedRows: [],
  };

  const seen = new Set<string>();
  const startIndex = hasHeader ? 1 : 0;

  for (let index = startIndex; index < lines.length; index += 1) {
    const rowNumber = index + 1;
    const cells = parseCsvLine(lines[index]);
    const phoneCandidate =
      phoneIndex >= 0
        ? cells[phoneIndex]
        : cells.find((cell) => /\d{10}/.test(cell.replace(/\D/g, '')));
    const normalizedPhone = phoneCandidate ? normalizePhoneNumber(phoneCandidate) : null;

    if (!normalizedPhone) {
      preview.rejectedRows.push({
        rowNumber,
        raw: cells,
        reason: 'No valid phone number found in the row.',
      });
      continue;
    }

    if (seen.has(normalizedPhone)) {
      preview.rejectedRows.push({
        rowNumber,
        raw: cells,
        reason: 'Duplicate phone number.',
      });
      continue;
    }

    const recipient: BlastRecipient = {
      rowNumber,
      name: nameIndex >= 0 ? cells[nameIndex] || undefined : undefined,
      phoneNumber: normalizedPhone,
    };

    seen.add(normalizedPhone);
    preview.validRecipients.push(recipient);
  }

  return preview;
}
