-- POS self-checkout integration (SCANnCART → pushcart-web).
--
-- The camera is a sensor and never owns money-relevant state: it sends a full snapshot of
-- "items on the counter now" through pos_reconcile, which diffs it against the camera-sourced
-- cart rows for the active session. Tablet routes read/edit/finish through SECURITY DEFINER
-- functions that first check the caller owns the cart.

-- ==========================================
-- Stations
-- ==========================================
CREATE TABLE public.stations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_stations_updated_at
BEFORE UPDATE ON public.stations
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;

-- Read-only for signed-in users (the tablet's station picker). No write policy: admins
-- create/rename stations through service-role routes.
CREATE POLICY "Anyone can view stations"
ON public.stations FOR SELECT TO authenticated USING (true);

-- ==========================================
-- Product class map
-- ==========================================
-- Several class slugs may map to one product (two packagings of one SKU); reconcile sums them.
CREATE TABLE public.product_class_map (
    class_slug TEXT PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_product_class_map_updated_at
BEFORE UPDATE ON public.product_class_map
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.product_class_map ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- Station sessions
-- ==========================================
CREATE TABLE public.station_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    station_id TEXT NOT NULL REFERENCES public.stations(id),
    session_ref TEXT NOT NULL UNIQUE,
    cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('open', 'completed', 'cancelled')) DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ
);

-- The backstop for two tablets racing one station: at most one open session per station.
CREATE UNIQUE INDEX station_sessions_one_open_per_station
ON public.station_sessions(station_id) WHERE status = 'open';

ALTER TABLE public.station_sessions ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- Camera provenance on cart_items (A5)
-- ==========================================
ALTER TABLE public.cart_items ADD COLUMN session_ref TEXT NULL;

CREATE INDEX cart_items_cart_session_idx ON public.cart_items(cart_id, session_ref);

-- At most one camera row per product per cart: what reconcile's ON CONFLICT relies on.
CREATE UNIQUE INDEX cart_items_camera_product
ON public.cart_items(cart_id, product_id) WHERE session_ref IS NOT NULL;

-- ==========================================
-- Customer overrides (A6)
-- ==========================================
CREATE TABLE public.station_session_overrides (
    session_ref TEXT NOT NULL REFERENCES public.station_sessions(session_ref) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (session_ref, product_id)
);

ALTER TABLE public.station_session_overrides ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- Audit trail
-- ==========================================
CREATE TABLE public.pos_sync_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_ref TEXT,
    kind TEXT NOT NULL CHECK (kind IN ('sync', 'customer_edit')),
    payload JSONB,
    results JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pos_sync_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Desktop function: pos_reconcile
-- SECURITY INVOKER, service-role only (the desktop routes send no cookie).
-- ============================================================
CREATE OR REPLACE FUNCTION public.pos_reconcile(
    p_session_ref TEXT,
    p_station_id TEXT,
    p_items JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_cart_id UUID;
    v_station_id TEXT;
    v_cart_status TEXT;
    v_item JSONB;
    v_class TEXT;
    v_qty INT;
    v_pid UUID;
    v_desired JSONB := '{}'::jsonb;
    v_mapped JSONB := '[]'::jsonb;
    v_status_by_product JSONB := '{}'::jsonb;
    v_results JSONB := '[]'::jsonb;
    v_existing_qty INT;
    v_status TEXT;
    v_key TEXT;
    v_val TEXT;
    v_changed BOOLEAN := false;
    v_rec RECORD;
    v_item_count INT;
    v_subtotal NUMERIC;
BEGIN
    -- Lock the open session row: serializes reconcile against Finish and tablet edits.
    SELECT ss.cart_id, ss.station_id, c.status
      INTO v_cart_id, v_station_id, v_cart_status
      FROM public.station_sessions ss
      JOIN public.carts c ON c.id = ss.cart_id
     WHERE ss.session_ref = p_session_ref
       AND ss.status = 'open'
       FOR UPDATE OF ss;

    IF NOT FOUND OR v_station_id IS DISTINCT FROM p_station_id THEN
        RETURN jsonb_build_object('error', 'session_closed');
    END IF;

    IF v_cart_status = 'paid' THEN
        RETURN jsonb_build_object('error', 'cart_paid');
    END IF;

    -- Map slugs to products (exact hits only) and build the desired quantity map.
    FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) LOOP
        v_class := v_item->>'class_name';
        v_qty := (v_item->>'quantity')::int;

        SELECT product_id INTO v_pid FROM public.product_class_map WHERE class_slug = v_class;

        IF v_pid IS NULL THEN
            v_results := v_results || jsonb_build_array(jsonb_build_object(
                'class_name', v_class, 'status', 'unmapped'));
            CONTINUE;
        END IF;

        -- The customer owns this product now: an override, or a manual row a staff member
        -- added. Never manage it from the camera again this session (A5/A6).
        IF EXISTS (SELECT 1 FROM public.station_session_overrides o
                    WHERE o.session_ref = p_session_ref AND o.product_id = v_pid)
           OR EXISTS (SELECT 1 FROM public.cart_items ci
                       WHERE ci.cart_id = v_cart_id AND ci.product_id = v_pid
                         AND ci.session_ref IS NULL) THEN
            v_results := v_results || jsonb_build_array(jsonb_build_object(
                'class_name', v_class, 'status', 'overridden'));
            CONTINUE;
        END IF;

        v_desired := jsonb_set(
            v_desired, ARRAY[v_pid::text],
            to_jsonb(COALESCE((v_desired->>v_pid::text)::int, 0) + v_qty));
        v_mapped := v_mapped || jsonb_build_array(jsonb_build_object(
            'class_name', v_class, 'product_id', v_pid));
    END LOOP;

    -- Apply the desired map against this session's camera rows.
    FOR v_key, v_val IN SELECT * FROM jsonb_each_text(v_desired) LOOP
        v_pid := v_key::uuid;
        v_qty := v_val::int;

        SELECT quantity INTO v_existing_qty
          FROM public.cart_items
         WHERE cart_id = v_cart_id AND product_id = v_pid
           AND session_ref = p_session_ref
         FOR UPDATE;

        IF NOT FOUND THEN
            INSERT INTO public.cart_items (cart_id, product_id, quantity, session_ref)
            VALUES (v_cart_id, v_pid, v_qty, p_session_ref)
            ON CONFLICT (cart_id, product_id) WHERE session_ref IS NOT NULL
            DO UPDATE SET quantity = EXCLUDED.quantity;
            v_status := 'added';
            v_changed := true;
        ELSIF v_existing_qty <> v_qty THEN
            UPDATE public.cart_items
               SET quantity = v_qty
             WHERE cart_id = v_cart_id AND product_id = v_pid
               AND session_ref = p_session_ref;
            v_status := 'updated';
            v_changed := true;
        ELSE
            v_status := 'updated';
        END IF;

        -- D5: warn while scanning if stock is short; Finish is what blocks.
        IF EXISTS (SELECT 1 FROM public.products p
                    WHERE p.id = v_pid AND p.stock_quantity < v_qty) THEN
            v_status := 'warned';
        END IF;

        v_status_by_product := jsonb_set(
            v_status_by_product, ARRAY[v_pid::text], to_jsonb(v_status));
    END LOOP;

    -- A camera row no longer desired is the camera saying the item is gone.
    FOR v_rec IN
        SELECT ci.id, ci.product_id
          FROM public.cart_items ci
         WHERE ci.cart_id = v_cart_id AND ci.session_ref = p_session_ref
           AND NOT (v_desired ? ci.product_id::text)
         FOR UPDATE
    LOOP
        DELETE FROM public.cart_items WHERE id = v_rec.id;
        v_changed := true;
        v_results := v_results || jsonb_build_array(jsonb_build_object(
            'class_name', COALESCE(
                (SELECT MIN(class_slug) FROM public.product_class_map WHERE product_id = v_rec.product_id),
                v_rec.product_id::text),
            'status', 'removed'));
    END LOOP;

    -- One result per input class, reading back the product's outcome.
    FOR v_rec IN SELECT value FROM jsonb_array_elements(v_mapped) LOOP
        v_pid := (v_rec.value->>'product_id')::uuid;
        v_status := v_status_by_product->>v_pid::text;
        v_results := v_results || jsonb_build_array(jsonb_build_object(
            'class_name', v_rec.value->>'class_name',
            'status', v_status,
            'low_stock_warning', v_status = 'warned'));
    END LOOP;

    -- A sync that changed the cart is the customer being present; a heartbeat is not.
    IF v_changed THEN
        UPDATE public.station_sessions
           SET last_activity_at = now()
         WHERE session_ref = p_session_ref;
    END IF;

    INSERT INTO public.pos_sync_log (session_ref, kind, payload, results)
    VALUES (p_session_ref, 'sync', COALESCE(p_items, '[]'::jsonb), v_results);

    SELECT COUNT(*), COALESCE(SUM(ci.quantity * p.price), 0)
      INTO v_item_count, v_subtotal
      FROM public.cart_items ci
      JOIN public.products p ON p.id = ci.product_id
     WHERE ci.cart_id = v_cart_id;

    RETURN jsonb_build_object(
        'results', v_results,
        'cart_totals', jsonb_build_object('item_count', v_item_count, 'subtotal', v_subtotal));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pos_reconcile(TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pos_reconcile(TEXT, TEXT, JSONB) TO service_role;

-- ============================================================
-- Tablet function: pos_open_session
-- SECURITY DEFINER; caller must own an active cart.
-- ============================================================
CREATE OR REPLACE FUNCTION public.pos_open_session(
    p_station_id TEXT,
    p_cart_id UUID,
    p_idle_cancel_minutes INT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_customer UUID;
    v_status TEXT;
    v_open_id UUID;
    v_last TIMESTAMPTZ;
    v_code UUID;
    v_ref TEXT;
BEGIN
    SELECT customer_id, status, code_token
      INTO v_customer, v_status, v_code
      FROM public.carts
     WHERE id = p_cart_id;

    IF NOT FOUND OR v_customer IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('error', 'forbidden');
    END IF;

    IF v_status <> 'active' THEN
        RETURN jsonb_build_object('error', 'cart_not_active');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.stations WHERE id = p_station_id) THEN
        RETURN jsonb_build_object('error', 'unknown_station');
    END IF;

    -- Lock any open session on this station and either clear an abandoned one or refuse.
    SELECT id, last_activity_at INTO v_open_id, v_last
      FROM public.station_sessions
     WHERE station_id = p_station_id AND status = 'open'
     FOR UPDATE;

    IF FOUND THEN
        IF v_last < now() - make_interval(mins => COALESCE(p_idle_cancel_minutes, 5)) THEN
            UPDATE public.station_sessions
               SET status = 'cancelled', ended_at = now()
             WHERE id = v_open_id;
        ELSE
            RETURN jsonb_build_object('error', 'busy');
        END IF;
    END IF;

    v_ref := 'scanncart-' || p_station_id || '-'
             || (extract(epoch FROM clock_timestamp()) * 1000)::bigint;

    BEGIN
        INSERT INTO public.station_sessions (station_id, session_ref, cart_id, status, last_activity_at)
        VALUES (p_station_id, v_ref, p_cart_id, 'open', now());
    EXCEPTION WHEN unique_violation THEN
        -- The partial unique index caught a race with another tablet.
        RETURN jsonb_build_object('error', 'busy');
    END;

    RETURN jsonb_build_object(
        'session_ref', v_ref,
        'cart_id', p_cart_id,
        'cart_code', v_code);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pos_open_session(TEXT, UUID, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pos_open_session(TEXT, UUID, INT) TO authenticated;

-- ============================================================
-- Tablet function: pos_my_session
-- ============================================================
CREATE OR REPLACE FUNCTION public.pos_my_session()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_out JSONB;
BEGIN
    SELECT jsonb_build_object(
        'session_ref', ss.session_ref,
        'cart_id', ss.cart_id,
        'cart_code', c.code_token,
        -- Liveness for the tablet's "camera offline" notice: the desktop writes a
        -- pos_sync_log row for every sync (including the 15 s heartbeat).
        'last_sync_at', (
            SELECT MAX(l.created_at)
              FROM public.pos_sync_log l
             WHERE l.session_ref = ss.session_ref AND l.kind = 'sync'))
      INTO v_out
      FROM public.station_sessions ss
      JOIN public.carts c ON c.id = ss.cart_id
     WHERE ss.status = 'open'
       AND c.customer_id = auth.uid()
     ORDER BY ss.created_at DESC
     LIMIT 1;

    RETURN v_out;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pos_my_session() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pos_my_session() TO authenticated;

-- ============================================================
-- Tablet function: pos_customer_edit
-- ============================================================
CREATE OR REPLACE FUNCTION public.pos_customer_edit(
    p_cart_id UUID,
    p_product_id UUID,
    p_quantity INT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_customer UUID;
    v_ref TEXT;
    v_from INT;
    v_manual_id UUID;
    v_camera_id UUID;
BEGIN
    SELECT customer_id INTO v_customer FROM public.carts WHERE id = p_cart_id;
    IF NOT FOUND OR v_customer IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('error', 'forbidden');
    END IF;

    SELECT session_ref INTO v_ref
      FROM public.station_sessions
     WHERE cart_id = p_cart_id AND status = 'open'
     FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'session_closed');
    END IF;

    SELECT COALESCE(SUM(quantity), 0) INTO v_from
      FROM public.cart_items
     WHERE cart_id = p_cart_id AND product_id = p_product_id;

    IF p_quantity > 0 THEN
        SELECT id INTO v_manual_id
          FROM public.cart_items
         WHERE cart_id = p_cart_id AND product_id = p_product_id AND session_ref IS NULL
         LIMIT 1;

        IF FOUND THEN
            UPDATE public.cart_items SET quantity = p_quantity WHERE id = v_manual_id;
            -- The manual row now represents the product; drop the camera row beside it.
            DELETE FROM public.cart_items
             WHERE cart_id = p_cart_id AND product_id = p_product_id AND session_ref = v_ref;
        ELSE
            SELECT id INTO v_camera_id
              FROM public.cart_items
             WHERE cart_id = p_cart_id AND product_id = p_product_id AND session_ref = v_ref
             LIMIT 1;

            IF FOUND THEN
                -- Turn the camera row into a manual row: reconcile leaves it alone from here.
                UPDATE public.cart_items
                   SET quantity = p_quantity, session_ref = NULL
                 WHERE id = v_camera_id;
            ELSE
                INSERT INTO public.cart_items (cart_id, product_id, quantity, session_ref)
                VALUES (p_cart_id, p_product_id, p_quantity, NULL);
            END IF;
        END IF;
    ELSE
        DELETE FROM public.cart_items
         WHERE cart_id = p_cart_id AND product_id = p_product_id;
    END IF;

    -- The override is what remembers a removal (no row is left) and what makes the next
    -- snapshot report the product as overridden instead of re-adding it (A6).
    INSERT INTO public.station_session_overrides (session_ref, product_id)
    VALUES (v_ref, p_product_id)
    ON CONFLICT (session_ref, product_id) DO NOTHING;

    UPDATE public.station_sessions SET last_activity_at = now() WHERE session_ref = v_ref;

    INSERT INTO public.pos_sync_log (session_ref, kind, payload, results)
    VALUES (
        v_ref,
        'customer_edit',
        jsonb_build_object('product_id', p_product_id, 'from_qty', v_from, 'to_qty', p_quantity),
        jsonb_build_object('status', 'ok'));

    RETURN jsonb_build_object('status', 'ok', 'product_id', p_product_id, 'quantity', p_quantity);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pos_customer_edit(UUID, UUID, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pos_customer_edit(UUID, UUID, INT) TO authenticated;

-- ============================================================
-- Tablet function: pos_finish
-- ============================================================
CREATE OR REPLACE FUNCTION public.pos_finish(p_cart_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_customer UUID;
    v_user UUID;
    v_status TEXT;
    v_ref TEXT;
    v_bad JSONB;
    v_subtotal NUMERIC;
    v_rate NUMERIC;
    v_vat NUMERIC;
    v_total NUMERIC;
    v_order_id UUID;
BEGIN
    SELECT customer_id, user_id, status
      INTO v_customer, v_user, v_status
      FROM public.carts
     WHERE id = p_cart_id
     FOR UPDATE;

    IF NOT FOUND OR v_customer IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('error', 'forbidden');
    END IF;

    IF v_status <> 'active' THEN
        RETURN jsonb_build_object('error', 'cart_not_active');
    END IF;

    SELECT session_ref INTO v_ref
      FROM public.station_sessions
     WHERE cart_id = p_cart_id AND status = 'open'
     FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'session_closed');
    END IF;

    -- Check stock before writing anything: the order insert would otherwise fail the
    -- products.stock_quantity >= 0 constraint with a generic 500 (D5).
    SELECT jsonb_agg(jsonb_build_object(
               'product_id', p.id, 'name', p.name,
               'in_cart', ci.quantity, 'in_stock', p.stock_quantity))
      INTO v_bad
      FROM public.cart_items ci
      JOIN public.products p ON p.id = ci.product_id
     WHERE ci.cart_id = p_cart_id AND ci.quantity > p.stock_quantity;

    IF v_bad IS NOT NULL THEN
        RETURN jsonb_build_object('error', 'insufficient_stock', 'items', v_bad);
    END IF;

    SELECT COALESCE(SUM(ci.quantity * p.price), 0)
      INTO v_subtotal
      FROM public.cart_items ci
      JOIN public.products p ON p.id = ci.product_id
     WHERE ci.cart_id = p_cart_id;

    SELECT rate INTO v_rate
      FROM public.vat_rates
     WHERE is_active = true
     ORDER BY updated_at DESC NULLS LAST
     LIMIT 1;
    v_rate := COALESCE(v_rate, 0);

    v_vat := round(v_subtotal * v_rate / 100, 2);
    v_total := v_subtotal + v_vat;

    INSERT INTO public.orders (cart_id, user_id, subtotal, vat_amount, total_amount)
    VALUES (p_cart_id, v_user, v_subtotal, v_vat, v_total)
    RETURNING id INTO v_order_id;

    -- on_order_created_deduct_stock fires on the insert: it deducts stock and sets the
    -- cart to `paid` itself, so this function does not touch the cart.
    UPDATE public.station_sessions
       SET status = 'completed', ended_at = now()
     WHERE session_ref = v_ref;

    RETURN jsonb_build_object('order_id', v_order_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pos_finish(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pos_finish(UUID) TO authenticated;
