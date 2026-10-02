import { NextRequest } from 'next/server';
import { validationErrorNextResponse } from '@/app/api/helpers/response';
import { openStationSession, getMySession } from '@/app/api/model/pos_sync';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return validationErrorNextResponse({ error: 'invalid json' });
  }

  const { station_id, cart_id } = (body ?? {}) as {
    station_id?: string;
    cart_id?: string;
  };

  if (!station_id || !cart_id) {
    return validationErrorNextResponse({
      error: 'station_id and cart_id required',
    });
  }

  return openStationSession(station_id, cart_id);
}

export async function GET() {
  return getMySession();
}
