DO $$
DECLARE
  -- We will look up the user you just created in the dashboard
  v_admin_id UUID;
  v_cat_food_id UUID := gen_random_uuid();
  v_cat_drink_id UUID := gen_random_uuid();
  v_cat_snack_id UUID := gen_random_uuid();
BEGIN
  -- ==========================================
  -- 1. ELEVATE YOUR NEW USER TO ADMIN
  -- ==========================================
  
  -- Find the user ID of the email you just registered
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@example.com' LIMIT 1;

  -- Update their automatically generated profile
  IF v_admin_id IS NOT NULL THEN
    UPDATE public.profiles 
    SET 
      role = 'admin', 
      first_name = 'Super', 
      last_name = 'Admin' 
    WHERE id = v_admin_id;
  END IF;

  -- ==========================================
  -- 2. SEED VAT RATE
  -- ==========================================
  
  INSERT INTO public.vat_rates (name, rate, is_active) 
  VALUES ('Standard Tax', 12.00, true);

  -- ==========================================
  -- 3. SEED CATEGORIES
  -- ==========================================
  
  INSERT INTO public.categories (id, name, description) VALUES 
    (v_cat_food_id, 'Hot Meals', 'Freshly cooked main courses'),
    (v_cat_drink_id, 'Beverages', 'Cold and hot drinks'),
    (v_cat_snack_id, 'Snacks', 'Quick bites and chips');

  -- ==========================================
  -- 4. SEED PRODUCTS
  -- ==========================================
  
  INSERT INTO public.products (name, sku, price, stock_quantity, category_id) VALUES
    ('Spaghetti Bolognese', 'SKU-FOOD-001', 12.50, 45, v_cat_food_id),
    ('Classic Cheeseburger', 'SKU-FOOD-002', 8.99, 30, v_cat_food_id),
    ('Grilled Chicken Salad', 'SKU-FOOD-003', 10.00, 20, v_cat_food_id),
    ('Iced Latte', 'SKU-DRNK-001', 4.50, 100, v_cat_drink_id),
    ('Mango Smoothie', 'SKU-DRNK-002', 5.50, 50, v_cat_drink_id),
    ('Sparkling Water', 'SKU-DRNK-003', 2.00, 200, v_cat_drink_id),
    ('Potato Chips', 'SKU-SNCK-001', 1.50, 80, v_cat_snack_id),
    -- Low stock items
    ('Premium Ribeye Steak', 'SKU-FOOD-004', 35.00, 4, v_cat_food_id),
    ('Craft IPA Beer', 'SKU-DRNK-004', 7.00, 2, v_cat_drink_id),
    ('Artisan Chocolate Truffle', 'SKU-SNCK-002', 3.50, 1, v_cat_snack_id);

END $$;
