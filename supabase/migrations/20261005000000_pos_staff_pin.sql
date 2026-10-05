-- ============================================================
-- POS: a staff code an admin can change without a redeploy
--
-- The staff removal on the tablet (Staff -> code -> Remove 1) was gated only by the
-- POS_STAFF_PIN environment variable, so changing the code meant editing the server's
-- environment and restarting it. The code now lives here, as a bcrypt hash, and an admin
-- changes it from /admin/<id>/pos-mapping. POS_STAFF_PIN stays as the fallback for an
-- install where no admin has set one, so an existing setup keeps working unchanged.
--
-- 1. pos_settings: one row, the hashed code, who changed it and when. RLS on, no policies:
--    only the SECURITY DEFINER functions below read or write it.
-- 2. pos_set_staff_pin(p_pin): admin only, 4-8 digits, stored with crypt()/gen_salt('bf').
-- 3. pos_clear_staff_pin(): admin only; falls back to POS_STAFF_PIN again.
-- 4. pos_staff_pin_status(): admin only; whether a code is set here and when it changed.
-- 5. pos_check_staff_pin(p_pin): service role only (the staff-remove route); never
--    returns the hash, only whether a code is set and whether this one matches.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pos_settings (
    id             BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
    staff_pin_hash TEXT,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by     UUID REFERENCES auth.users (id) ON DELETE SET NULL
);
ALTER TABLE public.pos_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pos_settings FROM anon, authenticated;
INSERT INTO public.pos_settings (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

-- 2. Set ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pos_set_staff_pin(p_pin TEXT)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_at TIMESTAMPTZ := now();
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
    IF p_pin IS NULL OR p_pin !~ '^[0-9]{4,8}$' THEN
        RAISE EXCEPTION 'staff_pin_format' USING ERRCODE = '22023';
    END IF;
    UPDATE public.pos_settings
       SET staff_pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf')),
           updated_at = v_at,
           updated_by = auth.uid()
     WHERE id;
    RETURN v_at;
END;
$$;
REVOKE ALL ON FUNCTION public.pos_set_staff_pin(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pos_set_staff_pin(TEXT) TO authenticated;

-- 3. Clear -------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pos_clear_staff_pin()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
    UPDATE public.pos_settings
       SET staff_pin_hash = NULL, updated_at = now(), updated_by = auth.uid()
     WHERE id;
END;
$$;
REVOKE ALL ON FUNCTION public.pos_clear_staff_pin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pos_clear_staff_pin() TO authenticated;

-- 4. Status (never the code) -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pos_staff_pin_status()
RETURNS TABLE (is_set BOOLEAN, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
    RETURN QUERY
        SELECT s.staff_pin_hash IS NOT NULL, s.updated_at FROM public.pos_settings s WHERE s.id;
END;
$$;
REVOKE ALL ON FUNCTION public.pos_staff_pin_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pos_staff_pin_status() TO authenticated;

-- 5. Check (service role only) -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pos_check_staff_pin(p_pin TEXT)
RETURNS TABLE (is_set BOOLEAN, matches BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT s.staff_pin_hash IS NOT NULL,
           s.staff_pin_hash IS NOT NULL
             AND p_pin IS NOT NULL
             AND s.staff_pin_hash = extensions.crypt(p_pin, s.staff_pin_hash)
      FROM public.pos_settings s
     WHERE s.id;
$$;
REVOKE ALL ON FUNCTION public.pos_check_staff_pin(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pos_check_staff_pin(TEXT) TO service_role;
