import { createClient, createServiceClient } from '@/config';
import {
  badRequestResponse,
  conflictRequestResponse,
  forbiddenResponse,
  generalErrorResponse,
  notFoundResponse,
  successResponse,
} from '../helpers/response';

export interface PosSyncItem {
  class_name: string;
  quantity: number;
  max_confidence?: number;
}

export interface PosSyncPayload {
  session_ref: string;
  station_id: string;
  items: PosSyncItem[];
  // SCANnCART basket mode: interactions the camera saw and could not resolve. Absent from
  // a counter-mode sync, which has no such notion and leaves the stored state alone.
  pending_review?: number;
  review_reasons?: string[];
}

// Map each function's {error} codes onto the shared response helpers (§3.4). The
// functions return jsonb, so `data` is an object (never the array shape getCarts assumes).
const mapError = (error: string, items?: unknown): Response => {
  switch (error) {
    case 'forbidden':
      return forbiddenResponse({ error: 'forbidden' });
    case 'unknown_station':
      return notFoundResponse({ error: 'unknown_station' });
    case 'invalid_quantity':
      return badRequestResponse({ error });
    case 'busy':
    case 'review_pending':
    case 'session_closed':
    case 'cart_paid':
    case 'cart_not_active':
    case 'insufficient_stock':
      return conflictRequestResponse(items ? { error, items } : { error });
    default:
      return generalErrorResponse({ error });
  }
};

export const getSessionForStation = async (stationId: string) => {
  try {
    const supabase = await createClient();

    const { data: station, error: stationError } = await supabase
      .from('stations')
      .select('id')
      .eq('id', stationId)
      .maybeSingle();

    if (stationError) {
      return generalErrorResponse({ error: stationError.message });
    }

    if (!station) {
      return notFoundResponse({ error: 'unknown_station' });
    }

    const { data, error } = await supabase
      .from('station_sessions')
      .select('session_ref, cart_id, carts:cart_id(status, code_token)')
      .eq('station_id', stationId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return generalErrorResponse({ error: error.message });
    }

    if (!data) {
      return successResponse({ message: 'Unbound', data: null });
    }

    // The untyped client widens the embedded FK to an array; it is a single object here.
    const cart = data.carts as unknown as {
      status: string;
      code_token: string;
    } | null;

    return successResponse({
      message: 'Successfully fetched session',
      data: {
        session_ref: data.session_ref,
        cart_id: data.cart_id,
        cart_code: cart?.code_token ?? null,
        cart_status: cart?.status ?? null,
      },
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
};

export const reconcileCart = async (payload: PosSyncPayload) => {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('pos_reconcile', {
      p_session_ref: payload.session_ref,
      p_station_id: payload.station_id,
      p_items: payload.items,
    });

    if (error) {
      return generalErrorResponse({ error: error.message });
    }

    const result = data as { error?: string } | null;

    if (result?.error) {
      return mapError(result.error);
    }

    // After the reconcile, so a closed session is reported by the call that owns that
    // answer. The review state is the scanner's whole current list, not a delta, so a
    // later sync that fails to land is corrected by the next heartbeat.
    if (typeof payload.pending_review === 'number') {
      const { data: review, error: reviewError } = await supabase.rpc(
        'pos_set_review',
        {
          p_session_ref: payload.session_ref,
          p_station_id: payload.station_id,
          p_pending: payload.pending_review,
          p_reasons: payload.review_reasons ?? [],
        },
      );
      if (reviewError) {
        return generalErrorResponse({ error: reviewError.message });
      }
      const reviewResult = review as { error?: string } | null;
      if (reviewResult?.error) return mapError(reviewResult.error);
    }

    return successResponse({
      message: 'Successfully synced cart',
      data: result,
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
};

export const openStationSession = async (stationId: string, cartId: string) => {
  try {
    const supabase = await createClient();
    const idleCancelMinutes = Number(process.env.POS_IDLE_CANCEL_MINUTES ?? 5);

    const { data, error } = await supabase.rpc('pos_open_session', {
      p_station_id: stationId,
      p_cart_id: cartId,
      p_idle_cancel_minutes: Number.isFinite(idleCancelMinutes)
        ? idleCancelMinutes
        : 5,
    });

    if (error) {
      return generalErrorResponse({ error: error.message });
    }

    const result = data as { error?: string } | null;

    if (result?.error) {
      return mapError(result.error);
    }

    return successResponse({
      message: 'Successfully opened station session',
      data: result,
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
};

export const getMySession = async () => {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('pos_my_session');

    if (error) {
      return generalErrorResponse({ error: error.message });
    }

    return successResponse({
      message: 'Successfully fetched session',
      data: (data as unknown) ?? null,
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
};

export const customerEdit = async (
  cartId: string,
  productId: string,
  quantity: number,
) => {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('pos_customer_edit', {
      p_cart_id: cartId,
      p_product_id: productId,
      p_quantity: quantity,
    });

    if (error) {
      return generalErrorResponse({ error: error.message });
    }

    const result = data as { error?: string } | null;

    if (result?.error) {
      return mapError(result.error);
    }

    return successResponse({
      message: 'Successfully edited cart',
      data: result,
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
};

export const finishCart = async (cartId: string) => {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('pos_finish', {
      p_cart_id: cartId,
    });

    if (error) {
      return generalErrorResponse({ error: error.message });
    }

    const result = data as { error?: string; items?: unknown } | null;

    if (result?.error) {
      return mapError(result.error, result.items);
    }

    return successResponse({
      message: 'Successfully finished cart',
      data: result,
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
};

// The one manual correction left on a camera-managed cart: staff lower a quantity. The
// route has already checked the PIN and that the caller owns the cart; the function is
// service-role only, so a browser holding the anon key cannot call it around the PIN.
export const staffRemove = async (
  cartId: string,
  productId: string,
  quantity: number,
) => {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase.rpc('pos_staff_remove', {
      p_cart_id: cartId,
      p_product_id: productId,
      p_quantity: quantity,
    });

    if (error) {
      return generalErrorResponse({ error: error.message });
    }

    const result = data as { error?: string } | null;

    if (result?.error) {
      return mapError(result.error);
    }

    return successResponse({
      message: 'Successfully removed item',
      data: result,
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
};
