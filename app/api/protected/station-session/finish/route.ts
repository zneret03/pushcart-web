import { NextRequest } from 'next/server';
import { validationErrorNextResponse } from '@/app/api/helpers/response';
import { finishCart } from '@/app/api/model/pos_sync';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return validationErrorNextResponse({ error: 'invalid json' });
  }

  const { cart_id } = (body ?? {}) as { cart_id?: string };

  if (!cart_id) {
    return validationErrorNextResponse({ error: 'cart_id required' });
  }

  return finishCart(cart_id);
}
