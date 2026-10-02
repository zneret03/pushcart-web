import { createClient } from '@/config';
import {
  generalErrorResponse,
  successResponse,
} from '@/app/api/helpers/response';

// The station picker reads this after the anonymous sign-in, so the caller already has
// a cookie; the `stations` SELECT policy for `authenticated` is what makes it work.
export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('stations')
      .select('id, name')
      .order('name');

    if (error) {
      return generalErrorResponse({ error: error.message });
    }

    return successResponse({
      message: 'Successfully fetched stations',
      data: data ?? [],
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
}
