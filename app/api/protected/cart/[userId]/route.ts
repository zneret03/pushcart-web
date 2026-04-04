import {
  generalErrorResponse,
  successResponse,
} from '@/app/api/helpers/response';
import { createClient } from '@/config';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('carts')
      .select(
        'id, user_id, customer_id, code_token, status, created_at, updated_at, archived_at',
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return generalErrorResponse({ message: error.message });
    }

    return successResponse({
      message: 'Successfully fetched cart',
      data,
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
}
