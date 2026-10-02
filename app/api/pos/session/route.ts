import { NextRequest } from 'next/server';
import {
  unauthorizedResponse,
  validationErrorNextResponse,
} from '@/app/api/helpers/response';
import { getSessionForStation } from '@/app/api/model/pos_sync';

// Desktop-facing route (A3): lives outside the /api/protected cookie matcher and
// authenticates with the x-pos-token header instead of a Supabase session.
function hasValidToken(req: NextRequest): boolean {
  const secret = process.env.POS_INGEST_SECRET;
  if (!secret) return false;
  return req.headers.get('x-pos-token') === secret;
}

export async function GET(req: NextRequest) {
  if (!hasValidToken(req)) {
    return unauthorizedResponse({ error: 'unauthorized' });
  }

  const stationId = req.nextUrl.searchParams.get('station_id');

  if (!stationId) {
    return validationErrorNextResponse({ error: 'station_id required' });
  }

  return getSessionForStation(stationId);
}
