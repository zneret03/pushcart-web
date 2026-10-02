import { NextRequest } from 'next/server';
import { createServiceClient } from '@/config';
import {
  conflictRequestResponse,
  generalErrorResponse,
  successResponse,
  validationErrorNextResponse,
} from '@/app/api/helpers/response';

// Admin-only CRUD. Runs as the service role because the POS tables carry no RLS
// policies; the /api/protected middleware has already required an admin cookie.
export async function GET() {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('stations')
      .select('id, name, created_at, updated_at')
      .order('name');

    if (error) return generalErrorResponse({ error: error.message });

    return successResponse({
      message: 'Successfully fetched stations',
      data: data ?? [],
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      id?: string;
      name?: string;
    } | null;

    const id = body?.id?.trim();
    const name = body?.name?.trim();

    if (!id || !name) {
      return validationErrorNextResponse({ error: 'id and name required' });
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('stations')
      .insert({ id, name })
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        return conflictRequestResponse({ error: 'station id already exists' });
      }
      return generalErrorResponse({ error: error.message });
    }

    return successResponse({
      message: 'Successfully added station',
      data,
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
}
