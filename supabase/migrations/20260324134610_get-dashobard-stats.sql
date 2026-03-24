CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_year INT DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  v_total_users INT;
  v_total_orders INT;
  v_total_products INT;
  v_monthly_sales NUMERIC(10, 2);
  v_low_stock jsonb;
  v_yearly_sales jsonb;
  v_result jsonb;
  v_target_year INT;
BEGIN
  -- 1. Security check: Only admins should see store-wide dashboard stats
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  -- 2. Determine the year to filter by (default to current year if not provided)
  v_target_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INT);

  -- 3. Get total users (counting only standard users)
  SELECT COUNT(*) INTO v_total_users 
  FROM public.profiles 
  WHERE role = 'user';

  -- 4. Get total orders
  SELECT COUNT(*) INTO v_total_orders 
  FROM public.orders;

  -- 5. Get total products
  SELECT COUNT(*) INTO v_total_products 
  FROM public.products;

  -- 6. Get total sales for the CURRENT calendar month
  SELECT COALESCE(SUM(total_amount), 0) INTO v_monthly_sales 
  FROM public.orders 
  WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE);

  -- 7. Get low stock products (< 5)
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', id,
        'name', name,
        'sku', sku,
        'stock_quantity', stock_quantity
      )
    ), 
    '[]'::jsonb
  ) INTO v_low_stock
  FROM public.products
  WHERE stock_quantity < 5;

  -- 8. Get yearly sales breakdown (Jan - Dec) for the target year
  -- Using generate_series(1,12) guarantees we get all 12 months even if sales are 0
  WITH months AS (
    SELECT generate_series(1, 12) AS month_num
  ),
  monthly_totals AS (
    SELECT 
      EXTRACT(MONTH FROM created_at)::INT AS month_num,
      SUM(total_amount) AS total_sales
    FROM public.orders
    WHERE EXTRACT(YEAR FROM created_at)::INT = v_target_year
    GROUP BY EXTRACT(MONTH FROM created_at)::INT
  )
  SELECT json_agg(
    json_build_object(
      'month', to_char(to_date(m.month_num::text, 'MM'), 'Mon'), -- Converts '1' to 'Jan', etc.
      'sales', COALESCE(mt.total_sales, 0)
    ) ORDER BY m.month_num
  ) INTO v_yearly_sales
  FROM months m
  LEFT JOIN monthly_totals mt ON m.month_num = mt.month_num;

  -- 9. Build and return the final JSON response
  v_result := jsonb_build_object(
    'totalUsers', v_total_users,
    'totalOrders', v_total_orders,
    'totalProducts', v_total_products,
    'totalMonthlySales', v_monthly_sales,
    'lowStockProducts', v_low_stock,
    'yearlySales', v_yearly_sales,
    'filteredYear', v_target_year
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
