-- 1. Create the function that performs the inventory deduction
CREATE OR REPLACE FUNCTION public.deduct_inventory_on_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Deduct the stock quantity for each product in the cart
  UPDATE public.products p
  SET stock_quantity = p.stock_quantity - ci.quantity
  FROM public.cart_items ci
  WHERE ci.cart_id = NEW.cart_id
    AND p.id = ci.product_id;

  -- Automatically update the cart status to 'completed'
  UPDATE public.carts
  SET status = 'paid'
  WHERE id = NEW.cart_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the trigger to the orders table
-- We use AFTER INSERT so it only deducts stock if the order creation was successful
DROP TRIGGER IF EXISTS on_order_created_deduct_stock ON public.orders;

CREATE TRIGGER on_order_created_deduct_stock
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE PROCEDURE public.deduct_inventory_on_order();
