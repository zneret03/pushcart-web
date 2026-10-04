-- Camera lost sight of an item (the tablet's pending state).
--
-- D2 is suspended: the desktop posts each class's cumulative *floor*, so `pos_reconcile` never
-- lowers a posted count and a taken item stops reading as anything at all — the row sits in
-- every snapshot exactly like an item still on the counter. The floor alone cannot tell the
-- tablet "the camera no longer sees this", so the desktop sends `lost: true` beside the item it
-- can no longer account for (POS_INTEGRATION_SPEC.md §3.2) and this migration turns that flag
-- into a per-row fact the tablet can render: `camera_lost_at`, stamped when the camera loses
-- the item and cleared the moment it sees it again.
--
-- The flag is a *transition*, not a state to re-stamp: `camera_lost_at` is when the camera lost
-- the item, not the timestamp of the last sync that repeated it. A lost badge is not the
-- customer being present, so it never touches `last_activity_at`.

ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS camera_lost_at timestamptz;

COMMENT ON COLUMN public.cart_items.camera_lost_at IS
  'When the camera last reported it could no longer account for this row (pos sync item field `lost`). NULL while the camera sees the item; cleared on recovery. Stamped by pos_reconcile.';

-- ============================================================
-- Camera-side reconcile, extended with the lost flag.
-- Identical to the 20261001090000 definition except:
--   * `lost` is read off each mapped sync item *after* the override check, so an overridden
--     product's flag is never read — the product is the customer's, and the camera says nothing
--     about it any more,
--   * the apply loop stamps/clears `camera_lost_at` per product.
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
    v_lost_by_product JSONB := '{}'::jsonb;
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

        -- `lost` says the camera can no longer account for this product. Accumulated per
        -- product (several classes can map to one product): if *any* class mapped to the
        -- product arrives lost, the product's row is stamped lost — the summed quantity
        -- includes that class's held units, so the row cannot claim the camera sees them all.
        IF COALESCE((v_item->>'lost')::boolean, false) THEN
            v_lost_by_product := jsonb_set(
                v_lost_by_product, ARRAY[v_pid::text], 'true'::jsonb, true);
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

        -- The lost flag is a transition: stamp it once when the camera loses the item, clear
        -- it the moment the camera sees it again. Repeats of an already-stamped state write
        -- nothing, and they do not count as the customer being present (v_changed untouched).
        IF COALESCE((v_lost_by_product->>v_pid::text)::boolean, false) THEN
            UPDATE public.cart_items
               SET camera_lost_at = now()
             WHERE cart_id = v_cart_id AND product_id = v_pid
               AND session_ref = p_session_ref
               AND camera_lost_at IS NULL;
        ELSE
            UPDATE public.cart_items
               SET camera_lost_at = NULL
             WHERE cart_id = v_cart_id AND product_id = v_pid
               AND session_ref = p_session_ref
               AND camera_lost_at IS NOT NULL;
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

-- ============================================================
-- Camera-side edit, extended to clear a stale lost flag.
-- Identical to the 20261001090000 definition except that turning a camera row into a manual
-- row also drops `camera_lost_at`: the row stops being the camera's, so the badge must not
-- survive the conversion onto a row the camera no longer describes.
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
                   SET quantity = p_quantity, session_ref = NULL, camera_lost_at = NULL
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
