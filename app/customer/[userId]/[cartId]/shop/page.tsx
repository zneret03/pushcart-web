import { JSX } from 'react';
import { getProducts } from '@/services/products/product.services';
import { ProductCards } from './components/ProductCards';
import { Container } from '@/components/custom/Container';
import { getCartItemsById, getCartsById } from '@/services/cart/cart.services';
import { CartItemsProducts } from '@/lib/types/Carts';
import { CartItems } from './components/CartItems';
import { EmptyImageData } from '@/components/custom/EmptyData';
import { formatCurrency } from '@/helpers/formatAmountPh';
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { getProfiles } from '@/services/users/users.services';
import { calculateCartTotal } from '@/app/user/[userId]/pos/helpers/calculateCartTotal';
import { ChooseCashier } from './components/ChooseCashier';
import { GoToCashier } from './components/GoToCashier';
import { Users } from '@/lib/types/users';

export default async function Shop({
  params,
  searchParams,
}: {
  params: Promise<{ cartId: string; userId: string }>;
  searchParams: Promise<{ page: string; search: string }>;
}): Promise<JSX.Element> {
  const { cartId, userId } = await params;
  const { page, search } = await searchParams;

  const response = await getProducts(
    `?page=${page || 1}&perPage=10&search=${search}&sortBy=created_at`,
  );

  const profilesResponse = await getProfiles(
    `?page=1&perPage=100&sortBy=created_at`,
  );

  const userProfiles = profilesResponse.profiles.filter(
    (item: Users) => item.role === 'user',
  );

  const cartResponse = await getCartsById(cartId);

  const cartItems = !cartId ? [] : await getCartItemsById(cartId, 'active');
  const subTotal = calculateCartTotal(cartItems as CartItemsProducts[]);
  const countCartItems = (cartItems as CartItemsProducts[]).length;

  return (
    <Container title="Shops" description="Customers can shops here">
      {cartResponse?.status === 'unpaid' && (
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-lg shadow-xs">
            <CardHeader>
              <h1>
                <strong className="text-3xl font-bold">Congratulations!</strong>
              </h1>
              <span className="text-gray-500">
                for checking out your product, please proceed to your chosen
                cashier, the id below is your cart identification.
              </span>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <Badge className="text-xl font-bold">
                {cartResponse.code_token}
              </Badge>

              <Separator />

              <h1 className="text-left">
                You can also <strong>Freely</strong> Change your cashier
              </h1>
              <ChooseCashier
                userProfiles={userProfiles}
                cartId={cartId}
                currentCashier={cartResponse?.user_id as string}
                userId={userId}
              />
            </CardContent>
            <CardFooter>
              <GoToCashier cartId={cartId} title="Reset Cart" status="active" />
            </CardFooter>
          </Card>
        </div>
      )}
      {cartResponse?.status === 'active' && (
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

            {countCartItems > 0 && (
              <ChooseCashier
                userProfiles={userProfiles}
                cartId={cartId}
                currentCashier={cartResponse?.user_id as string}
                userId={userId}
              />
            )}

            <Card className="w-full border-none shadow-none">
              <CardFooter className="flex items-center justify-between py-4">
                <span className="text-foreground text-sm font-bold">
                  Total payment
                </span>
                <span className="text-foreground text-lg font-bold">
                  {formatCurrency(subTotal)}
                </span>
              </CardFooter>

              {userId !== cartResponse?.user_id && (
                <GoToCashier
                  cartId={cartId}
                  title="Go to Cashier"
                  status="unpaid"
                />
              )}
            </Card>

            {countCartItems <= 0 && <EmptyImageData />}
          </section>
        </main>
      )}
    </Container>
  );
}
