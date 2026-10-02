import { NextRequest } from 'next/server';
import { validationErrorNextResponse } from '@/app/api/helpers/response';
import { customerEdit } from '@/app/api/model/pos_sync';

// Customer edits go through pos_customer_edit, never the generic cart-items routes:
// the override it records is what stops the next camera sync from re-adding the item (A6).
export async function PUT(
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

  const { cart_id, quantity } = (body ?? {}) as {
    cart_id?: string;
    quantity?: number;
  };

  if (
    !cart_id ||
    typeof quantity !== 'number' ||
    !Number.isInteger(quantity) ||
    quantity < 0
  ) {
    return validationErrorNextResponse({
      error: 'cart_id and a non-negative integer quantity required',
    });
  }

  return customerEdit(cart_id, productId, quantity);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params;

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const cartId =
    ((body ?? {}) as { cart_id?: string }).cart_id ??
    req.nextUrl.searchParams.get('cart_id');

  if (!cartId) {
    return validationErrorNextResponse({ error: 'cart_id required' });
  }

  return customerEdit(cartId, productId, 0);
}
