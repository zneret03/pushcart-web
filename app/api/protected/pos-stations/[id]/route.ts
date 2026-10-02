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
      name?: string;
    } | null;
    const name = body?.name?.trim();

    if (!name) return validationErrorNextResponse({ error: 'name required' });

    const supabase = createServiceClient();

    const { error } = await supabase
      .from('stations')
      .update({ name })
      .eq('id', id);

    if (error) return generalErrorResponse({ error: error.message });

    return successResponse({ message: 'Successfully updated station' });
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

    const { error } = await supabase.from('stations').delete().eq('id', id);

    if (error) return generalErrorResponse({ error: error.message });

    return successResponse({ message: 'Successfully deleted station' });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
}
