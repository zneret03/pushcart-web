import { createClient } from '@/config';
import { successResponse, generalErrorResponse } from '../../helpers/response';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_dashboard_stats');

    if (error) {
      return generalErrorResponse({ error: error.message });
    }

    return successResponse({
      message: 'Successfully fetch dashboard stats',
      data,
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
}
