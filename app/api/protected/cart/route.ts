import { generalErrorResponse, successResponse } from '../../helpers/response';
import { createClient } from '@/config';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('carts')
      .select('id, code_token, created_at')
      .eq('status', 'unpaid');

    if (error) {
      console.error(error.message);
      generalErrorResponse({ error: error.message });
      return;
    }

    return successResponse({
      message: 'Successfully fetched cart',
      data,
    });
  } catch (error) {
    const newError = error as Error;
    console.error(newError.message);
    return generalErrorResponse({ error: newError.message });
  }
}
