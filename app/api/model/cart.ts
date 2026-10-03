import {
  forbiddenResponse,
  generalErrorResponse,
  successResponse,
} from '../helpers/response';
import { createClient, createServiceClient } from '@/config';
import { cartAccess } from '../helpers/cart-access';

export const editCart = async (
  data: { [key: string]: string | Date },
  id: string,
) => {
  try {
    const supabase = await createClient();
    const access = await cartAccess(supabase, id);
    if (access.response) return access.response;
    if (
      !access.admin &&
      data.status &&
      !['active', 'unpaid'].includes(String(data.status))
    ) {
      return forbiddenResponse({ error: 'Payment requires checkout' });
    }
    if (
      data.user_id &&
      !access.admin &&
      access.cart?.customer_id !== access.user?.id
    ) {
      return forbiddenResponse();
    }
    if (data.user_id && data.user_id !== access.cart?.customer_id) {
      const directory = createServiceClient();
      const { data: cashier } = await directory
        .from('profiles')
        .select('id')
        .eq('id', data.user_id)
        .eq('role', 'user')
        .is('archived_at', null)
        .maybeSingle();
      const { data: account } = await directory.auth.admin.getUserById(
        String(data.user_id),
      );
      if (!cashier || !account.user || account.user.is_anonymous)
        return forbiddenResponse({ error: 'Invalid cashier' });
    }
    const { error } = await supabase.from('carts').update(data).eq('id', id);
    if (error) return generalErrorResponse({ error: error.message });
    return successResponse({ message: 'Successfully updated cart' });
  } catch (error) {
    return generalErrorResponse({ error: (error as Error).message });
  }
};
