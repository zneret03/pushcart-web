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
  return cartAccess(supabase, item.cart_id);
}

