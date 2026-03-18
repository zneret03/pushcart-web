import {
  generalErrorResponse,
  successResponse,
  validationErrorNextResponse,
} from '@/app/api/helpers/response';
import { createClient } from '@/config';
import { isEmpty } from 'lodash';
import { editCartItems } from '@/app/api/model/cart_items';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('cart_items')
      .select(
        'id, carts:cart_id!inner(status), products(name, sku, price, stock_quantity, image_url, created_at), quantity, created_at',
      )
      .eq('carts.status', 'unpaid')
      .eq('cart_id', id);

    if (error) {
      console.error(error.message);
      generalErrorResponse({ error: error.message });
      return;
    }

    return successResponse({
      message: 'Successfully fetched cart items',
      data,
    });
  } catch (error) {
    const newError = error as Error;
    console.error(newError.message);
    return generalErrorResponse({ error: newError.message });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();

  if (isEmpty(body)) {
    return validationErrorNextResponse();
  }

  if (body.type === 'update-quantity') {
    return editCartItems({ quantity: body.quantity }, id);
  }
}
