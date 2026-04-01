import { NextRequest, NextResponse } from 'next/server';
import { ChatXAI } from '@langchain/xai';

import { getViewerContext } from '@/lib/auth';

const SYSTEM_ADMIN = `You are the admin Vapi operations copilot. Give concrete implementation guidance, callouts for limitations, and exact next actions.`;
const SYSTEM_CLIENT = `You are the workspace Vapi helper. Keep guidance practical and safe, limited to allowed dashboard actions. For restricted or risky tasks, direct the user to support.`;

export async function POST(req: NextRequest) {
  try {
    const viewer = await getViewerContext();

    if (!viewer) {
      return NextResponse.json({ error: 'You must be signed in to use the assistant copilot.' }, { status: 401 });
    }

    const { role = 'client', question } = await req.json();

    if (!question) {
      return NextResponse.json({ error: 'question is required' }, { status: 400 });
    }

    const model = new ChatXAI({
      apiKey: process.env.XAI_API_KEY,
      model: process.env.XAI_MODEL || 'grok-4-latest',
      temperature: 0.2
    });

    const systemPrompt = role === 'admin' && viewer.isPlatformAdmin ? SYSTEM_ADMIN : SYSTEM_CLIENT;
    const res = await model.invoke([
      ['system', systemPrompt],
      ['user', question]
    ]);

    return NextResponse.json({ answer: res.content });
  } catch (error) {
    return NextResponse.json({ error: 'assistant-chat failed', detail: String(error) }, { status: 500 });
  }
}
