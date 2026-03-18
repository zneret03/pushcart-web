import { generalErrorResponse, successResponse } from '../helpers/response';
import { createClient } from '@/config';

export const editCartItems = async (
  data: { [key: string]: string | Date },
  id: string,
) => {
  try {
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
