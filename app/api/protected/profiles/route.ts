import { NextRequest } from 'next/server';
import { createClient } from '@/config';
import { paginatedData } from '../../helpers/paginated-data';
import {
  badRequestResponse,
  generalErrorResponse,
  successResponse,
} from '../../helpers/response';
import { signUp } from '../../model/profiles';
import { Users } from '@/lib/types/users';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const url = req.nextUrl.searchParams;

    const page = Number(url.get('page') || 1);
    const perPage = Number(url.get('perPage') || 10);
    const sortBy = url.get('sortBy') || 'created_at';
    const search = url.get('search') || '';
    const limit = url.get('limit') || '';

    const { data, error, count, totalPages, currentPage } =
      await paginatedData<Users>({
        tableName: 'profiles',
        supabase,
        columns:
          'id, email, first_name, last_name, middle_name, address, role, avatar_url, created_at, updated_at',
        search: { column: 'email', query: search },
        page,
        perPage,
        sortBy,
        limit: Number(limit) as number,
      });

    if (error) {
      return badRequestResponse({ error: error.message });
    }

    return successResponse({
      message: 'Successfully fetch profiles',
      data: {
        profiles: data || null,
        count,
        totalPages,
        currentPage,
      },
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.formData();

    if (body.get('type') === 'sign-up') {
      return signUp(body);
    }
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
}
