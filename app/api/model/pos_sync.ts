import { createClient } from '@/config';
import {
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
}

// Map each function's {error} codes onto the shared response helpers (§3.4). The
// functions return jsonb, so `data` is an object (never the array shape getCarts assumes).
const mapError = (error: string, items?: unknown): Response => {
  switch (error) {
    case 'forbidden':
      return forbiddenResponse({ error: 'forbidden' });
    case 'unknown_station':
      return notFoundResponse({ error: 'unknown_station' });
    case 'busy':
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
