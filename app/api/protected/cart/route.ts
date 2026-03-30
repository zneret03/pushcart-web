import { NextRequest } from 'next/server';
import { generalErrorResponse, successResponse } from '../../helpers/response';
import { createClient } from '@/config';

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams;
    const search = url.get('search') || '';

    const supabase = await createClient();

    let query = supabase
      .from('carts')
      .select('id, code_token, created_at')
      .eq('status', 'unpaid');

    if (search) {
      query = query.ilike('code_token', `%${search}%`);
    }

    const { data, error } = await query;

    console.log(data);

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
