import { NextRequest } from 'next/server';
import {
  unauthorizedResponse,
  validationErrorNextResponse,
} from '@/app/api/helpers/response';
import {
  reconcileCart,
  type PosSyncItem,
  type PosSyncPayload,
} from '@/app/api/model/pos_sync';

function hasValidToken(req: NextRequest): boolean {
  const secret = process.env.POS_INGEST_SECRET;
  if (!secret) return false;
  return req.headers.get('x-pos-token') === secret;
}

// All payload validation lives here in TypeScript; the Postgres function assumes a
// well-formed snapshot (§3.2 step 1).
function validate(
  body: unknown,
): { payload: PosSyncPayload } | { error: string } {
  const b = body as Partial<PosSyncPayload> | null;

  if (!b || typeof b !== 'object') return { error: 'invalid body' };
  if (typeof b.session_ref !== 'string' || !b.session_ref) {
    return { error: 'session_ref required' };
  }
  if (typeof b.station_id !== 'string' || !b.station_id) {
    return { error: 'station_id required' };
  }
  if (!Array.isArray(b.items)) return { error: 'items must be an array' };
  if (b.items.length > 200) return { error: 'at most 200 items' };

  const seen = new Set<string>();

  for (const item of b.items as PosSyncItem[]) {
    if (!item || typeof item.class_name !== 'string' || !item.class_name) {
      return { error: 'class_name required' };
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      return { error: 'quantity must be an integer >= 1' };
    }
    if (seen.has(item.class_name)) {
      return { error: `duplicate class_name: ${item.class_name}` };
    }
    seen.add(item.class_name);
  }

  return { payload: b as PosSyncPayload };
}

export async function POST(req: NextRequest) {
  if (!hasValidToken(req)) {
    return unauthorizedResponse({ error: 'unauthorized' });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return validationErrorNextResponse({ error: 'invalid json' });
  }

  const validated = validate(body);

  if ('error' in validated) {
    return validationErrorNextResponse({ error: validated.error });
  }

  return reconcileCart(validated.payload);
}
