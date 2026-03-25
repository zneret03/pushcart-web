import { createClient } from '@/config';
import {
  successResponse,
  generalErrorResponse,
} from '../../../helpers/response';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ year: string }> },
) {
  const { year } = await params;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_dashboard_stats', {
      p_year: Number(year),
    });

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
