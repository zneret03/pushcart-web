import { CartItemsProducts } from '@/lib/types/Carts';

export function updateItemQuantity(
  items: CartItemsProducts[],
  targetId: string,
  delta: number,
) {
  return items.map((item) => {
    if (item.id === targetId) {
      const newQuantity = (item.quantity ?? 0) + delta;

      return {
        ...item,
        quantity: newQuantity < 1 ? 1 : newQuantity,
      };
    }
    return item;
  });
}
