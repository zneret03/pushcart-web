import { timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';
import { createClient, createServiceClient } from '@/config';
import { cartAccess } from '@/app/api/helpers/cart-access';
import {
  forbiddenResponse,
  validationErrorNextResponse,
} from '@/app/api/helpers/response';
import { staffRemove } from '@/app/api/model/pos_sync';

// Staff lower a quantity on a camera-managed cart: the fallback for a removal the camera
// could not see. The code is the one an admin set in POS Mapping (stored hashed in
// pos_settings); with none set there, POS_STAFF_PIN is the fallback, and with neither the
// removal is off. The code is checked here, on the server, and the function behind it is
// service-role only, so the tablet cannot skip this route.
//
// Wrong PINs are throttled per cart: five misses lock that cart's staff removal for a
// minute, which is enough to stop a customer guessing a short PIN at the counter.
const MAX_MISSES = 5;
const LOCK_MS = 60_000;
const misses = new Map<string, { count: number; until: number }>();

function pinMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// The admin-set code wins; the environment's is used only when none is set.
async function checkPin(pin: string): Promise<'off' | 'match' | 'mismatch'> {
  const { data, error } = await createServiceClient().rpc(
    'pos_check_staff_pin',
    { p_pin: pin },
  );
  const row = (Array.isArray(data) ? data[0] : data) as
    | { is_set?: boolean; matches?: boolean }
    | null
    | undefined;
  if (!error && row?.is_set) return row.matches ? 'match' : 'mismatch';
  const fallback = process.env.POS_STAFF_PIN ?? '';
  if (!fallback) return 'off';
  return pinMatches(pin, fallback) ? 'match' : 'mismatch';
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return validationErrorNextResponse({ error: 'invalid json' });
  }
  const { cart_id, quantity, pin } = (body ?? {}) as {
    cart_id?: string;
    quantity?: number;
    pin?: string;
  };
  if (
    !cart_id ||
    typeof pin !== 'string' ||
    typeof quantity !== 'number' ||
    !Number.isInteger(quantity) ||
    quantity < 1
  ) {
    return validationErrorNextResponse({
      error: 'cart_id, pin and a positive integer quantity required',
    });
  }

  // The tablet's own session must own this cart: a PIN is not a licence to edit any cart.
  const supabase = await createClient();
  const access = await cartAccess(supabase, cart_id);
  if (access.response) return access.response;

  const now = Date.now();
  const state = misses.get(cart_id);
  if (state && state.until > now) {
    return forbiddenResponse({ error: 'staff_pin_locked' });
  }
  const verdict = await checkPin(pin);
  if (verdict === 'off') {
    return forbiddenResponse({ error: 'staff_removal_disabled' });
  }
  if (verdict !== 'match') {
    // A lock that has run out starts a fresh count rather than re-locking on the next miss.
    const expired =
      state !== undefined && state.until !== 0 && state.until <= now;
    const count = (expired ? 0 : (state?.count ?? 0)) + 1;
    misses.set(cart_id, {
      count,
      until: count >= MAX_MISSES ? now + LOCK_MS : 0,
    });
    return forbiddenResponse({ error: 'staff_pin_invalid' });
  }
  misses.delete(cart_id);

  return staffRemove(cart_id, productId, quantity);
}
