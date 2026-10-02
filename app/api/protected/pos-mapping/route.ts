import { NextRequest } from 'next/server';
import { createServiceClient } from '@/config';
import {
  conflictRequestResponse,
  generalErrorResponse,
  successResponse,
  validationErrorNextResponse,
} from '@/app/api/helpers/response';

export async function GET() {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('product_class_map')
      .select(
        'class_slug, product_id, note, created_at, updated_at, products(name, sku)',
      )
      .order('class_slug');

    if (error) return generalErrorResponse({ error: error.message });

    return successResponse({
      message: 'Successfully fetched class mappings',
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
      class_slug?: string;
      product_id?: string;
      note?: string | null;
    } | null;

    const classSlug = body?.class_slug?.trim();
    const productId = body?.product_id?.trim();

    if (!classSlug || !productId) {
      return validationErrorNextResponse({
        error: 'class_slug and product_id required',
      });
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('product_class_map')
      .insert({
        class_slug: classSlug,
        product_id: productId,
        note: body?.note ?? null,
      })
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        return conflictRequestResponse({ error: 'class_slug already mapped' });
      }
      return generalErrorResponse({ error: error.message });
    }

    return successResponse({
      message: 'Successfully added mapping',
      data,
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
}
