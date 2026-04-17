function isMissingRelationMessage(message: string) {
  return /relation .* does not exist|Could not find the table|schema cache/i.test(message);
}

export async function safeInsert(supabase: any, table: string, payload: unknown) {
  const result = await supabase.from(table).insert(payload);

  if (result.error && !isMissingRelationMessage(result.error.message)) {
    throw new Error(result.error.message);
  }
}

export async function safeUpsert(
  supabase: any,
  table: string,
  payload: unknown,
  options?: Record<string, unknown>,
) {
  const result = await supabase.from(table).upsert(payload, options);

  if (result.error && !isMissingRelationMessage(result.error.message)) {
    throw new Error(result.error.message);
  }
}

export async function safeUpdateById(
  supabase: any,
  table: string,
  id: string,
  payload: unknown,
) {
  const result = await supabase.from(table).update(payload).eq('id', id);

  if (result.error && !isMissingRelationMessage(result.error.message)) {
    throw new Error(result.error.message);
  }
}
