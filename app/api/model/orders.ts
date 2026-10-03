import { generalErrorResponse, successResponse } from '../helpers/response';
import { createClient, createServiceClient } from '@/config';
import { cartAccess } from '../helpers/cart-access';
import { forbiddenResponse } from '../helpers/response';
import { OrdersInsert } from '@/lib/types/Orders';

export const addOrders = async (data: OrdersInsert) => {
  try {
    const supabase = await createClient();

    const access = await cartAccess(supabase, data.cart_id);
    if (access.response) return access.response;
    if (
      !access.admin &&
      (access.cart?.user_id !== access.user?.id ||
        data.user_id !== access.user?.id)
    )
      return forbiddenResponse();

    // Authorized cashier/admin path; direct customer order writes are denied by RLS.
    const writer = createServiceClient();
    const { error: cartsError } = await writer
      .from('carts')
      .update({
        status: 'paid',
      })
      .eq('id', data?.cart_id);

    if (cartsError) {
      return generalErrorResponse({ error: cartsError.message });
    }

    const { error: ordersError } = await writer.from('orders').insert(data);

    if (ordersError) {
      return generalErrorResponse({ error: ordersError.message });
    }

    return successResponse({
      message: 'Successfuly added orders',
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
};
