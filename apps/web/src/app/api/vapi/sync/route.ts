import { NextRequest, NextResponse } from 'next/server';
import { createAssistant } from '@/lib/vapi';

/**
 * Admin endpoint to spin up assistants quickly from dashboard templates.
 * Extend with authz + tenant checks before production use.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const created = await createAssistant(body);
    return NextResponse.json({ ok: true, assistant: created });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
