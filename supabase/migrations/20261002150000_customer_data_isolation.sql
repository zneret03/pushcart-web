-- Customer isolation at the database boundary, including direct publishable-key clients.
-- Policies are ORed: remove every old policy on these four tables before replacing them.
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('profiles', 'carts', 'cart_items', 'orders')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p JOIN auth.users u ON u.id = p.id
    WHERE p.id = auth.uid() AND p.role = 'admin' AND p.archived_at IS NULL
      AND NOT COALESCE(u.is_anonymous, false)
  );
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());
CREATE POLICY profiles_insert ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY profiles_delete ON public.profiles FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY carts_read ON public.carts FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR user_id = auth.uid() OR public.is_admin());
CREATE POLICY carts_insert ON public.carts FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR
    (customer_id = auth.uid() AND user_id = auth.uid() AND status = 'active'));
CREATE POLICY carts_update ON public.carts FOR UPDATE TO authenticated
  USING (customer_id = auth.uid() OR user_id = auth.uid() OR public.is_admin())
  WITH CHECK (customer_id = auth.uid() OR user_id = auth.uid() OR public.is_admin());
CREATE POLICY carts_delete ON public.carts FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY items_read ON public.cart_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND
    (c.customer_id = auth.uid() OR c.user_id = auth.uid() OR public.is_admin())));
CREATE POLICY items_insert ON public.cart_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND
    (public.is_admin() OR (c.status IN ('active', 'unpaid') AND
      (c.customer_id = auth.uid() OR c.user_id = auth.uid())))));
CREATE POLICY items_update ON public.cart_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND
    (public.is_admin() OR (c.status IN ('active', 'unpaid') AND
      (c.customer_id = auth.uid() OR c.user_id = auth.uid())))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND
    (public.is_admin() OR (c.status IN ('active', 'unpaid') AND
      (c.customer_id = auth.uid() OR c.user_id = auth.uid())))));
CREATE POLICY items_delete ON public.cart_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND
    (public.is_admin() OR (c.status IN ('active', 'unpaid') AND
      (c.customer_id = auth.uid() OR c.user_id = auth.uid())))));

CREATE POLICY orders_read ON public.orders FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND
    (c.customer_id = auth.uid() OR c.user_id = auth.uid())));
-- No direct customer INSERT/UPDATE/DELETE. pos_finish is the SECURITY DEFINER transaction;
-- existing server cashier order routes can explicitly use a service client after authorization.
CREATE POLICY orders_admin ON public.orders FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- SECURITY INVOKER triggers: current_user remains authenticated for direct clients, but
-- privileged service writes and SECURITY DEFINER POS/auth functions retain their DB role.
CREATE OR REPLACE FUNCTION public.guard_customer_profile()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user = 'authenticated' AND NOT public.is_admin() AND
    (NEW.id IS DISTINCT FROM OLD.id OR NEW.role IS DISTINCT FROM OLD.role OR
     NEW.archived_at IS DISTINCT FROM OLD.archived_at) THEN
    RAISE EXCEPTION 'Profile authorization fields cannot be changed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_customer_profile BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_customer_profile();

CREATE OR REPLACE FUNCTION public.valid_cashier(p_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p JOIN auth.users u ON u.id = p.id
    WHERE p.id = p_id AND p.role = 'user' AND p.archived_at IS NULL
      AND NOT COALESCE(u.is_anonymous, false));
$$;
REVOKE ALL ON FUNCTION public.valid_cashier(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.valid_cashier(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_customer_cart()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user = 'authenticated' AND NOT public.is_admin() THEN
    IF NEW.customer_id IS DISTINCT FROM OLD.customer_id OR
       NEW.id IS DISTINCT FROM OLD.id OR NEW.code_token IS DISTINCT FROM OLD.code_token OR
       NEW.archived_at IS DISTINCT FROM OLD.archived_at THEN
      RAISE EXCEPTION 'Cart ownership fields cannot be changed' USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND
       (OLD.status = 'paid' OR NEW.status = 'paid') THEN
      RAISE EXCEPTION 'Payment requires checkout' USING ERRCODE = '42501';
    END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id AND
       (OLD.customer_id IS DISTINCT FROM auth.uid() OR
        (NEW.user_id IS DISTINCT FROM OLD.customer_id AND NOT public.valid_cashier(NEW.user_id))) THEN
      RAISE EXCEPTION 'Invalid cashier assignment' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_customer_cart BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.guard_customer_cart();
