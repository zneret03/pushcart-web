import { NextRequest } from 'next/server';
import { createServiceClient } from '@/config';
import {
  generalErrorResponse,
  successResponse,
} from '@/app/api/helpers/response';

// Staff escape hatch for an abandoned session (§6): move an open session to cancelled.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await req.json().catch(() => null)) as {
      status?: string;
    } | null;

    if (body?.status !== 'cancelled') {
      return generalErrorResponse({ error: 'only cancellation is supported' });
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from('station_sessions')
      .update({ status: 'cancelled', ended_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'open');

    if (error) return generalErrorResponse({ error: error.message });

    return successResponse({ message: 'Successfully cancelled session' });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
}
