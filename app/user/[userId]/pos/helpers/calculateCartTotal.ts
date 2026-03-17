import { CartItemsProducts } from '@/lib/types/Carts';

export const calculateCartTotal = (items: CartItemsProducts[]): number => {
  if (!items || items.length === 0) return 0;

  return items.reduce((acc, item) => {
    const price = item.products?.price ?? 0;
    const quantity = item.quantity ?? 0;

    return acc + price * quantity;
  }, 0);
};
