import { JSX } from 'react';
import { getCartItemsById } from '@/services/cart/cart.services';
import { getCarts } from '@/services/cart/cart.services';
import { Orders } from './components/Orders';
import { CartItemsProducts, Carts } from '@/lib/types/Carts';

export default async function PostPage({
  searchParams,
  params,
}: {
  searchParams: Promise<{ cartId: string }>;
  params: Promise<{ userId: string }>;
}): Promise<JSX.Element> {
  const { cartId } = await searchParams;
  const { userId } = await params;
  const carts = await getCarts();
  const cartItems = !cartId ? [] : await getCartItemsById(cartId);

  return (
    <div className="container mx-auto h-auto space-y-4 py-12">
      <header>
        <h1 className="text-4xl font-bold">Orders</h1>
        <span className="text-gray-500">all users orders can see here</span>
      </header>

      <Orders
        carts={carts as Carts[]}
        cartItems={cartItems as CartItemsProducts[]}
        cartId={cartId}
        userId={userId}
      />
    </div>
  );
}
