import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getDefaultOrganizationId, getViewerContext } from '@/lib/auth';
import {
  canViewerAccessOrganization,
  createSupportTicket,
  getViewerOrganizationId,
  loadSupportTickets,
} from '@/lib/voiceops-platform';

const createTicketSchema = z.object({
  organizationId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  ticketType: z.enum(['revision', 'question', 'bug', 'meeting']),
  subject: z.string().min(2),
  description: z.string().min(2),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  preferredMeetingAt: z.string().optional(),
});

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const viewer = await getViewerContext();

    if (!viewer) {
      return NextResponse.json({ error: 'You must be signed in to view tickets.' }, { status: 401 });
    }

    const url = new URL(request.url);
    const organizationId = getViewerOrganizationId(viewer, url.searchParams.get('organizationId'));

    if (!organizationId) {
      return NextResponse.json({ error: 'No organization is available for this viewer.' }, { status: 400 });
    }

    if (!canViewerAccessOrganization(viewer, organizationId)) {
      return NextResponse.json({ error: 'You do not have access to this workspace.' }, { status: 403 });
    }

    const tickets = await loadSupportTickets(organizationId);
    return NextResponse.json({ ok: true, tickets });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load tickets.' },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const viewer = await getViewerContext();

    if (!viewer) {
      return NextResponse.json({ error: 'You must be signed in to create a ticket.' }, { status: 401 });
    }

    const payload = createTicketSchema.parse(await request.json());
    const organizationId = payload.organizationId ?? getDefaultOrganizationId(viewer);

    if (!organizationId) {
      return NextResponse.json({ error: 'No organization is assigned to this account.' }, { status: 400 });
    }

    if (!canViewerAccessOrganization(viewer, organizationId)) {
      return NextResponse.json({ error: 'You do not have access to this workspace.' }, { status: 403 });
    }

    const ticket = await createSupportTicket({
      organizationId,
      agentId: payload.agentId,
      contactId: payload.contactId,
      ticketType: payload.ticketType,
      subject: payload.subject,
      description: payload.description,
      priority: payload.priority,
      preferredMeetingAt: payload.preferredMeetingAt,
      viewer,
    });

    return NextResponse.json({ ok: true, ticket });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create the ticket.' },
      { status: 400 },
    );
  }
}
