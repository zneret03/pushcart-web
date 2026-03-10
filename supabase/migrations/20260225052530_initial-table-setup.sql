CREATE TYPE user_role AS ENUM ('admin', 'user');
CREATE TYPE cart_status AS ENUM ('active', 'scanned_by_admin', 'completed', 'abandoned');

-- Reusable function to automatically update the 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('products', 'products', TRUE, 5242880); -- 5MB limit

CREATE POLICY "Upload Select products" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'products');
CREATE POLICY "Upload Insert products" ON storage.objects
    FOR INSERT TO public WITH CHECK (bucket_id = 'products');
CREATE POLICY "Upload Update products" ON storage.objects
    FOR UPDATE TO public USING (bucket_id = 'products');
CREATE POLICY "Upload Delete products" ON storage.objects
    FOR DELETE TO public USING (bucket_id = 'products');

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('avatar', 'avatar', TRUE, 5242880); -- 5MB limit

CREATE POLICY "Upload Select avatar" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'avatar');
CREATE POLICY "Upload Insert avatar" ON storage.objects
    FOR INSERT TO public WITH CHECK (bucket_id = 'avatar');
CREATE POLICY "Upload Update avatar" ON storage.objects
    FOR UPDATE TO public USING (bucket_id = 'avatar');
CREATE POLICY "Upload Delete avatar" ON storage.objects
    FOR DELETE TO public USING (bucket_id = 'avatar');

-- Function to generate a random SKU (e.g., 'SKU-A1B2C3D4')
CREATE OR REPLACE FUNCTION public.generate_random_sku()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN 'SKU-' || result;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    middle_name TEXT,
    avatar_url TEXT,
    address TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE
);

-- Trigger to update timestamp on profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Automatically create a profile when a new user signs up in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, email)
  VALUES (new.id, 'user'::public.user_role, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Helper function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" 
ON profiles FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "Admin can insert users" 
ON profiles FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "Users can update own profile, Admins can update all" 
ON profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR is_admin());

CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT UNIQUE DEFAULT public.generate_random_sku() NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE
);

-- Trigger to update timestamp on products
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Products RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view products" 
ON products FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert products" 
ON products FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "Admins can update products" 
ON products FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY "Admins can delete products" 
ON products FOR DELETE TO authenticated USING (is_admin());

CREATE TABLE carts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    code_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL, 
    status cart_status DEFAULT 'active'::cart_status NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE
);

-- Trigger to update timestamp on carts
CREATE TRIGGER update_carts_updated_at
BEFORE UPDATE ON carts
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Carts RLS
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own carts, admins view all" 
ON carts FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can create carts" 
ON carts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users and admins can update carts" 
ON carts FOR UPDATE TO authenticated USING (user_id = auth.uid() OR is_admin());

CREATE TABLE cart_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cart_id UUID REFERENCES carts(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cart_id, product_id)
);

-- Trigger to update timestamp on cart_items
CREATE TRIGGER update_cart_items_updated_at
BEFORE UPDATE ON cart_items
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Cart Items RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own cart items, admins view all" 
ON cart_items FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM carts WHERE id = cart_items.cart_id AND (user_id = auth.uid() OR is_admin())));

CREATE POLICY "Users manage active cart items" 
ON cart_items FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM carts WHERE id = cart_items.cart_id AND user_id = auth.uid() AND status = 'active'));

CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cart_id UUID REFERENCES carts(id) UNIQUE NOT NULL,
    admin_id UUID REFERENCES profiles(id) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    vat_amount NUMERIC(10, 2) NOT NULL,
    discount_amount NUMERIC(10, 2) DEFAULT 0,
    total_amount NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE
);

-- Trigger to update timestamp on orders
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Orders RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage orders" 
ON orders FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Users view own orders" 
ON orders FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM carts WHERE id = orders.cart_id AND user_id = auth.uid()));
