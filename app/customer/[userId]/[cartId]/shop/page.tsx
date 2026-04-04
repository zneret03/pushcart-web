import { JSX } from 'react';
import { getProducts } from '@/services/products/product.services';
import { ProductCards } from './components/ProductCards';
import { Container } from '@/components/custom/Container';
import { getCartItemsById } from '@/services/cart/cart.services';
import { CartItemsProducts } from '@/lib/types/Carts';
import { CartItems } from './components/CartItems';
import { EmptyImageData } from '@/components/custom/EmptyData';

export default async function Shop({
  params,
  searchParams,
}: {
  params: Promise<{ cartId: string }>;
  searchParams: Promise<{ page: string; search: string }>;
}): Promise<JSX.Element> {
  const { cartId } = await params;
  const { page, search } = await searchParams;

  const response = await getProducts(
    `?page=${page || 1}&perPage=10&search=${search}&sortBy=created_at`,
  );

  const cartItems = !cartId ? [] : await getCartItemsById(cartId, 'unpaid');

  return (
    <Container title="Shops" description="Customers can shops here">
      <main className="flex gap-2">
        <section className="flex-2">
          <ProductCards
            {...{
              cartId,
              products: response.products,
              totalPages: response?.totalPages,
              currentPage: response?.currentPage,
              count: response?.count,
            }}
          />
        </section>
        <section className="flex-1 space-y-4">
          <div>
            <h1 className="text-3xl font-bold">Cart Orders</h1>
            <p className="text-gray-500">
              all user cart orders can be seen here
            </p>
          </div>
          {(cartItems as CartItemsProducts[]).map((item: CartItemsProducts) => (
            <CartItems key={item.id} cartItems={item} />
          ))}

          {(cartItems as CartItemsProducts[]).length <= 0 && <EmptyImageData />}
        </section>
      </main>
    </Container>
  );
}
