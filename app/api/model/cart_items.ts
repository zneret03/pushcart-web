import { generalErrorResponse, successResponse } from '../helpers/response';
import { createClient } from '@/config';

export const editCartItems = async (
  data: { [key: string]: string | Date },
  id: string,
) => {
  try {
    console.log(data, id);
    const supabase = await createClient();

    const { error } = await supabase
      .from('cart_items')
      .update(data)
      .eq('id', id);

    if (error) {
      return generalErrorResponse({ error: error.message });
    }

    return successResponse({
      message: 'Successfully updated cart items',
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
};

export const addToCart = async (args: {
  cartId: string;
  productId: string;
}) => {
  try {
    const { cartId: cart_id, productId: product_id } = args;
    const supabase = await createClient();

    const { error } = await supabase.from('cart_items').insert({
      cart_id: cart_id,
      product_id,
      quantity: 1,
    });

    if (error) {
      return generalErrorResponse({ error: error.message });
    }

    return successResponse({
      message: 'Successfully added items to cart',
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
};

export const deleteCartItems = async (id: string) => {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from('cart_items').delete().eq('id', id);

    if (error) {
      return generalErrorResponse({ error: error.message });
    }

    return successResponse({
      message: 'Successfully delete cart items',
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
};
