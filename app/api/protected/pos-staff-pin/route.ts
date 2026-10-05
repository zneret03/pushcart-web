import { NextRequest } from 'next/server';
import { createClient } from '@/config';
import {
  forbiddenResponse,
  generalErrorResponse,
  successResponse,
  validationErrorNextResponse,
} from '@/app/api/helpers/response';

// The staff code for the tablet's staff removal (Staff -> code -> Remove 1).
//
// Runs as the signed-in user, not the service role: the database functions refuse anyone but
// an admin (is_admin()), so the permission is enforced where the code is stored rather than by
// this route's path. The code itself never leaves the database - only whether one is set, when
// it last changed, and whether the server's POS_STAFF_PIN fallback exists.

export type StaffPinSource = 'admin' | 'server' | 'off';

function deny(error: { code?: string; message: string }) {
  if (error.code === '42501')
    return forbiddenResponse({ error: 'admins only' });
  if (error.message.includes('staff_pin_format')) {
    return validationErrorNextResponse({
      error: 'The code must be 4 to 8 digits.',
    });
  }
  return generalErrorResponse({ error: error.message });
}

async function status() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('pos_staff_pin_status');
  if (error) return deny(error);
  const row = (Array.isArray(data) ? data[0] : data) as
    | { is_set: boolean; updated_at: string }
    | undefined;
  const serverFallback = Boolean(process.env.POS_STAFF_PIN);
  const source: StaffPinSource = row?.is_set
    ? 'admin'
    : serverFallback
      ? 'server'
      : 'off';
  return successResponse({
    message: 'Staff code status',
    data: {
      source,
      updated_at: row?.is_set ? row.updated_at : null,
      server_fallback: serverFallback,
    },
  });
}

export async function GET() {
  try {
    return await status();
  } catch (error) {
    return generalErrorResponse({ error: (error as Error).message });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      pin?: unknown;
    } | null;
    const pin = typeof body?.pin === 'string' ? body.pin.trim() : '';
    if (!/^[0-9]{4,8}$/.test(pin)) {
      return validationErrorNextResponse({
        error: 'The code must be 4 to 8 digits.',
      });
    }
    const supabase = await createClient();
    const { error } = await supabase.rpc('pos_set_staff_pin', { p_pin: pin });
    if (error) return deny(error);
    return await status();
  } catch (error) {
    return generalErrorResponse({ error: (error as Error).message });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc('pos_clear_staff_pin');
    if (error) return deny(error);
    return await status();
  } catch (error) {
    return generalErrorResponse({ error: (error as Error).message });
  }
}
