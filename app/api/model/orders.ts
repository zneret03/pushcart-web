import { generalErrorResponse, successResponse } from '../helpers/response';
import { createClient } from '@/config';
import { OrdersInsert } from '@/lib/types/Orders';

export const addOrders = async (data: OrdersInsert) => {
  try {
    const supabase = await createClient();

    const { error: cartsError } = await supabase
      .from('carts')
      .update({
        status: 'paid',
      })
      .eq('id', data?.cart_id);

    if (cartsError) {
      return generalErrorResponse({ error: cartsError.message });
    }

    const { error: ordersError } = await supabase.from('orders').insert(data);

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
