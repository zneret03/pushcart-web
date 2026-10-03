import {
  forbiddenResponse,
  unauthorizedResponse,
} from '@/app/api/helpers/response';
import { createServerClient } from '@supabase/ssr';
import { NextFetchEvent, NextProxy, NextRequest } from 'next/server';

export function authMiddlware(next: NextProxy) {
  return async (req: NextRequest, event: NextFetchEvent) => {
    if (!req.nextUrl.pathname.startsWith('/api/protected/'))
      return next(req, event);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { cookies: { getAll: () => req.cookies.getAll(), setAll() {} } },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const admin = !user.is_anonymous && profile?.role === 'admin';
    const staff = !user.is_anonymous && (admin || profile?.role === 'user');
    const path = req.nextUrl.pathname.slice('/api/protected/'.length);
    const read = req.method === 'GET';
    const customerRoute =
      path === 'stations' ||
      path === 'vat/all' ||
      path === 'cashiers' ||
      (read && (path === 'products' || path === 'categories')) ||
      path === 'station-session' ||
      path.startsWith('station-session/') ||
      path === 'cart' ||
      path.startsWith('cart/') ||
      path === 'cart_items' ||
      path.startsWith('cart_items/') ||
      (path === `profiles/update/${user.id}` && req.method === 'PUT');
    const staffRoute = path === 'orders' && staff;
    if (!admin && !customerRoute && !staffRoute) return forbiddenResponse();
    return next(req, event);
  };
}

export const config = { matcher: '/api/protected/:path*' };
