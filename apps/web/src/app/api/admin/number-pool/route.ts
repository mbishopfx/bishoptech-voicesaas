import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requirePlatformAdmin } from '@/lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { safeInsert, safeUpdateById } from '@/lib/ops-storage';

const mutationSchema = z.object({
  action: z.enum(['reserve', 'release']),
  reservationId: z.string().optional(),
  organizationId: z.string().uuid().optional(),
  phoneNumber: z.string().optional(),
  label: z.string().optional(),
  assignedTo: z.string().optional(),
});

export async function GET() {
  await requirePlatformAdmin();
  const supabase = getSupabaseAdminClient();
  const result = await supabase
    .from('managed_number_reservations')
    .select('id, organization_id, phone_number, label, status, assigned_to, reservation_ends_at, last_used_at')
    .order('created_at', { ascending: false });

  return NextResponse.json({
    reservations: result.error ? [] : result.data,
  });
}

export async function POST(request: Request) {
  try {
    await requirePlatformAdmin();
    const payload = mutationSchema.parse(await request.json());
    const supabase = getSupabaseAdminClient();

    if (payload.action === 'reserve') {
      await safeInsert(supabase, 'managed_number_reservations', {
        id: randomUUID(),
        organization_id: payload.organizationId ?? null,
        phone_number: payload.phoneNumber ?? 'Demo number pending',
        label: payload.label ?? 'Managed demo line',
        status: 'reserved',
        assigned_to: payload.assignedTo ?? 'Assistant Factory',
        reservation_ends_at: new Date(Date.now() + 1000 * 60 * 45).toISOString(),
      });
    } else if (payload.reservationId) {
      await safeUpdateById(supabase, 'managed_number_reservations', payload.reservationId, {
        status: 'free',
        assigned_to: null,
        reservation_ends_at: null,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Number pool update failed.' },
      { status: 400 },
    );
  }
}
