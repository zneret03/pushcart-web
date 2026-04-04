import { JSX } from 'react';
import { getProducts } from '@/services/products/product.services';
import { ProductCards } from './components/ProductCards';
import { Container } from '@/components/custom/Container';
import { getCartItemsById } from '@/services/cart/cart.services';
import { CartItemsProducts } from '@/lib/types/Carts';
import { CartItems } from './components/CartItems';
import { Button } from '@/components/ui/button';
import { EmptyImageData } from '@/components/custom/EmptyData';
import { formatCurrency } from '@/helpers/formatAmountPh';
import { Card, CardFooter } from '@/components/ui/card';
import { calculateCartTotal } from '@/app/user/[userId]/pos/helpers/calculateCartTotal';

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

  const cartItems = !cartId ? [] : await getCartItemsById(cartId, 'active');
  const subTotal = calculateCartTotal(cartItems as CartItemsProducts[]);

  return (
    <Container title="Shops" description="Customers can shops here">
      <main className="flex gap-2">
        <section className="flex-3">
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
        <section className="flex-2 space-y-4">
          <div>
            <h1 className="text-3xl font-bold">Cart Orders</h1>
            <p className="text-gray-500">
              all user cart orders can be seen here
            </p>
          </div>
          <section className="h-[20rem] space-y-4 overflow-auto">
            {(cartItems as CartItemsProducts[]).map(
              (item: CartItemsProducts) => (
                <CartItems key={item.id} cartItems={item} />
              ),
            )}
          </section>

          <Card className="w-full border-none shadow-none">
            <CardFooter className="flex items-center justify-between py-4">
              <span className="text-foreground text-sm font-bold">
                Total payment
              </span>
              <span className="text-foreground text-lg font-bold">
                {formatCurrency(subTotal)}
              </span>
            </CardFooter>

            <Button>Go to Cashier</Button>
          </Card>

          {(cartItems as CartItemsProducts[]).length <= 0 && <EmptyImageData />}
        </section>
      </main>
    </Container>
  );
}
