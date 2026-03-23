import { NextRequest } from 'next/server';
import {
  badRequestResponse,
  successResponse,
  generalErrorResponse,
} from '../../helpers/response';
import { createClient } from '@/config';
import { addOrders } from '../../model/orders';
import { Orders } from '@/lib/types/Orders';
import { paginatedData } from '../../helpers/paginated-data';

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
      await paginatedData<Orders>({
        tableName: 'orders',
        supabase,
        columns:
          'id, subtotal, profiles(id, first_name, last_name, middle_name), carts:cart_id!inner(id, status, cart_items(id, quantity, products(name, image_url, price, sku))), vat_amount, discount_amount, total_amount, created_at, updated_at',
        search: { column: 'name', query: search },
        page,
        perPage,
        sortBy,
        limit: Number(limit) as number,
      });

    if (error) {
      return badRequestResponse({ error: error.message });
    }

    return successResponse({
      message: 'Successfully fetch orders',
      data: {
        orders: data || null,
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
  const body = await req.json();

  if (body.type === 'add-orders') {
    const { type, ...rest } = body;
    return addOrders(rest);
  }
}
