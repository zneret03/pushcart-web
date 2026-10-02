import { CookieOptions, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// A cookie-less server client that always runs as the service role. Used by routes that
// must write the POS tables, which deliberately carry no RLS policies: the tablet reaches
// them only through SECURITY DEFINER functions, and the desktop/admin routes with this key.
// Never expose this to the browser (SUPABASE_SECRET_KEY is server-only).
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {},
    },
  });
}

export async function createClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options: CookieOptions;
        }[],
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}
