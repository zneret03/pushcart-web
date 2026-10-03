import { createServiceClient } from '@/config';
import {
  generalErrorResponse,
  successResponse,
} from '@/app/api/helpers/response';

export async function GET() {
  // Middleware verified the caller; expose only the minimal directory across profile RLS.
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'user')
    .not('email', 'is', null)
    .is('archived_at', null)
    .order('created_at');
  if (error) return generalErrorResponse({ error: error.message });
  return successResponse({ data: data ?? [] });
}
