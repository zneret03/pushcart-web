import { NextRequest } from 'next/server';
import { createServiceClient } from '@/config';
import {
  generalErrorResponse,
  successResponse,
  validationErrorNextResponse,
} from '@/app/api/helpers/response';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await req.json().catch(() => null)) as {
      product_id?: string;
      note?: string | null;
    } | null;

    const productId = body?.product_id?.trim();

    if (!productId) {
      return validationErrorNextResponse({ error: 'product_id required' });
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from('product_class_map')
      .update({ product_id: productId, note: body?.note ?? null })
      .eq('class_slug', id);

    if (error) return generalErrorResponse({ error: error.message });

    return successResponse({ message: 'Successfully updated mapping' });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('product_class_map')
      .delete()
      .eq('class_slug', id);

    if (error) return generalErrorResponse({ error: error.message });

    return successResponse({ message: 'Successfully deleted mapping' });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
}
