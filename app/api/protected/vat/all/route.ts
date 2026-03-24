import { createClient } from '@/config';
import {
  badRequestResponse,
  generalErrorResponse,
  successResponse,
} from '../../../helpers/response';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('vat_rates')
      .select('id, rate')
      .maybeSingle();

    if (error) {
      return badRequestResponse({ error: error.message });
    }

    return successResponse({
      message: 'Successfully fetch vat',
      data: {
        vat: data || null,
      },
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
}
