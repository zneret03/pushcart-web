import {
  generalErrorResponse,
  successResponse,
} from '@/app/api/helpers/response';
import { createClient } from '@/config';
import { cartAccess } from '@/app/api/helpers/cart-access';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; status: string }> },
) {
  try {
    const supabase = await createClient();
    const { id, status } = await params;

    const access = await cartAccess(supabase, id);
    if (access.response) return access.response;

    const { data, error } = await supabase
      .from('cart_items')
      .select(
        // product_id (and products.id) are what the tablet's per-product edit route keys on.
        // camera_lost_at is the desktop's lost-sight flag, stamped by pos_reconcile — the
        // tablet renders it as the row's "camera lost this item" pending state.
        'id, product_id, carts:cart_id!inner(status), products(id, name, sku, price, stock_quantity, image_url, created_at), quantity, camera_lost_at, created_at',
      )
      .eq('carts.status', status)
      .eq('cart_id', id);

    if (error) {
      console.error(error.message);
      return generalErrorResponse({ error: error.message });
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
