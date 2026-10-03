-- ============================================================
-- POS: camera-only carts (SCANnCART basket mode)
--
-- The self-checkout cart is now the camera's: customers can no longer add, change or
-- remove items by hand, the scanner can tell the tablet it saw something it could not
-- resolve (and Finish waits for that), and the only manual correction left is a
-- staff-PIN removal that can only lower a quantity.
--
-- 1. station_sessions carries the scanner's review state (pending_review, review_reasons).
-- 2. cart_in_pos_session(): whether a cart belongs to an open station session.
-- 3. RESTRICTIVE cart_items policies: no direct writes to such a cart except by an admin,
--    so neither the legacy cart routes nor a browser holding the anon key can edit it.
--    SECURITY DEFINER functions and the service role bypass RLS, which is the point:
--    reconcile and the staff removal are the only writers.
-- 4. pos_set_review(): the desktop sync records the review state (service role only).
-- 5. pos_my_session(): also returns the review state, for the tablet.
-- 6. pos_finish(): refuses while review is pending ('review_pending').
-- 7. pos_customer_edit(): no longer callable by customers.
-- 8. pos_staff_remove(): decrease-only, service role only; the route checks the PIN.
-- ============================================================

-- 1. Review state ------------------------------------------------------------
ALTER TABLE public.station_sessions
    ADD COLUMN pending_review INT NOT NULL DEFAULT 0 CHECK (pending_review >= 0),
    ADD COLUMN review_reasons JSONB NOT NULL DEFAULT '[]'::jsonb;

-- The audit trail learns the staff correction.
ALTER TABLE public.pos_sync_log DROP CONSTRAINT IF EXISTS pos_sync_log_kind_check;
ALTER TABLE public.pos_sync_log
    ADD CONSTRAINT pos_sync_log_kind_check
    CHECK (kind IN ('sync', 'customer_edit', 'staff_edit'));

-- 2. Is this cart in a self-checkout session? -------------------------------
-- SECURITY DEFINER because station_sessions has no RLS policies: read as the caller, the
-- table looks empty and the restrictive policies below would never fire.
CREATE OR REPLACE FUNCTION public.cart_in_pos_session(p_cart_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.station_sessions ss
         WHERE ss.cart_id = p_cart_id AND ss.status = 'open'
    );
$$;
REVOKE ALL ON FUNCTION public.cart_in_pos_session(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cart_in_pos_session(UUID) TO authenticated, service_role;

-- 3. No direct writes to a camera-managed cart --------------------------------
CREATE POLICY items_pos_locked_insert ON public.cart_items AS RESTRICTIVE
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin() OR NOT public.cart_in_pos_session(cart_id));
CREATE POLICY items_pos_locked_update ON public.cart_items AS RESTRICTIVE
    FOR UPDATE TO authenticated
    USING (public.is_admin() OR NOT public.cart_in_pos_session(cart_id))
    WITH CHECK (public.is_admin() OR NOT public.cart_in_pos_session(cart_id));
CREATE POLICY items_pos_locked_delete ON public.cart_items AS RESTRICTIVE
    FOR DELETE TO authenticated
    USING (public.is_admin() OR NOT public.cart_in_pos_session(cart_id));

-- 4. The desktop records the scanner's review state ---------------------------
CREATE OR REPLACE FUNCTION public.pos_set_review(
    p_session_ref TEXT,
    p_station_id TEXT,
    p_pending INT,
    p_reasons JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    UPDATE public.station_sessions
       SET pending_review = GREATEST(COALESCE(p_pending, 0), 0),
           review_reasons = COALESCE(p_reasons, '[]'::jsonb)
     WHERE session_ref = p_session_ref
       AND station_id = p_station_id
       AND status = 'open';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'session_closed');
    END IF;

    RETURN jsonb_build_object('status', 'ok');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.pos_set_review(TEXT, TEXT, INT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pos_set_review(TEXT, TEXT, INT, JSONB) TO service_role;

-- 5. The tablet sees the review state -----------------------------------------
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
        'last_sync_at', (
            SELECT MAX(l.created_at)
              FROM public.pos_sync_log l
             WHERE l.session_ref = ss.session_ref AND l.kind = 'sync'),
        'pending_review', ss.pending_review,
        'review_reasons', ss.review_reasons)
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

-- 6. Finish waits for review --------------------------------------------------
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
    v_pending INT;
    v_reasons JSONB;
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

    SELECT session_ref, pending_review, review_reasons
      INTO v_ref, v_pending, v_reasons
      FROM public.station_sessions
     WHERE cart_id = p_cart_id AND status = 'open'
     FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'session_closed');
    END IF;

    -- The scanner saw an interaction it could not resolve: the cart may be missing a
    -- deposit or still holding an item that went back out. Staff check the basket first.
    IF v_pending > 0 THEN
        RETURN jsonb_build_object('error', 'review_pending', 'items', v_reasons);
    END IF;

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

    UPDATE public.station_sessions
       SET status = 'completed', ended_at = now()
     WHERE session_ref = v_ref;

    RETURN jsonb_build_object('order_id', v_order_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pos_finish(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pos_finish(UUID) TO authenticated;

-- 7. Customers no longer edit the camera's cart ------------------------------
REVOKE EXECUTE ON FUNCTION public.pos_customer_edit(UUID, UUID, INT) FROM authenticated;

-- 8. Staff removal: the one manual correction, decrease-only -----------------
CREATE OR REPLACE FUNCTION public.pos_staff_remove(
    p_cart_id UUID,
    p_product_id UUID,
    p_quantity INT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_ref TEXT;
    v_from INT;
    v_to INT;
BEGIN
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

    IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > v_from THEN
        RETURN jsonb_build_object('error', 'invalid_quantity');
    END IF;

    v_to := v_from - p_quantity;

    -- One manual row carries what is left (or none), and the override stops the camera
    -- re-adding what staff took off (A6) — the same shape a customer edit used to leave.
    DELETE FROM public.cart_items WHERE cart_id = p_cart_id AND product_id = p_product_id;
    IF v_to > 0 THEN
        INSERT INTO public.cart_items (cart_id, product_id, quantity, session_ref)
        VALUES (p_cart_id, p_product_id, v_to, NULL);
    END IF;

    INSERT INTO public.station_session_overrides (session_ref, product_id)
    VALUES (v_ref, p_product_id)
    ON CONFLICT (session_ref, product_id) DO NOTHING;

    UPDATE public.station_sessions SET last_activity_at = now() WHERE session_ref = v_ref;

    INSERT INTO public.pos_sync_log (session_ref, kind, payload, results)
    VALUES (
        v_ref,
        'staff_edit',
        jsonb_build_object('product_id', p_product_id, 'from_qty', v_from, 'to_qty', v_to),
        jsonb_build_object('status', 'ok'));

    RETURN jsonb_build_object('status', 'ok', 'product_id', p_product_id, 'quantity', v_to);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.pos_staff_remove(UUID, UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pos_staff_remove(UUID, UUID, INT) TO service_role;
