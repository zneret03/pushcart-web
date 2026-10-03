import { SupabaseClient } from '@supabase/supabase-js';
import {
  forbiddenResponse,
  generalErrorResponse,
  unauthorizedResponse,
  validationErrorNextResponse,
} from './response';

export async function cartAccess(supabase: SupabaseClient, id: string) {
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
    return {
      response: validationErrorNextResponse({ error: 'Invalid cart ID' }),
    };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { response: unauthorizedResponse() };
  const { data: cart, error } = await supabase
    .from('carts')
    .select('customer_id, user_id, status')
    .eq('id', id)
    .maybeSingle();
  if (error)
    return { response: generalErrorResponse({ error: error.message }) };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const admin = !user.is_anonymous && profile?.role === 'admin';
  if (
    !cart ||
    (!admin && cart.customer_id !== user.id && cart.user_id !== user.id)
  ) {
    return { response: forbiddenResponse({ error: 'This cart is not yours' }) };
  }
  return { cart, user, admin, response: null };
}

export async function cartItemAccess(supabase: SupabaseClient, id: string) {
  const { data: item, error } = await supabase
    .from('cart_items')
    .select('cart_id')
    .eq('id', id)
    .maybeSingle();
  if (error)
    return { response: generalErrorResponse({ error: error.message }) };
  if (!item) return { response: forbiddenResponse() };
  const access = await cartAccess(supabase, item.cart_id);
  return { ...access, cartId: item.cart_id as string };
}

// A cart in an open self-checkout session is the camera's: nobody but an admin writes its
// items through the generic routes. The database refuses those writes too (a restrictive
// policy on cart_items), but there a refused write is a silent no-op; this is what turns it
// into an answer the caller can read.
export async function posLockResponse(
  supabase: SupabaseClient,
  cartId: string,
  admin: boolean,
) {
  if (admin) return null;
  const { data, error } = await supabase.rpc('cart_in_pos_session', {
    p_cart_id: cartId,
  });
  if (error) return generalErrorResponse({ error: error.message });
  return data === true
    ? forbiddenResponse({
        error: 'pos_cart_locked',
        message: 'This cart is managed by the self-checkout camera.',
      })
    : null;
}
