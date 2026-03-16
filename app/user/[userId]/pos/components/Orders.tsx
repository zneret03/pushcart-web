'use client';

import { CartItemsProducts, Carts } from '@/lib/types/Carts';
import { OrdersCard } from './OrdersCards';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrdersTable } from './OrdersTable';
import { JSX } from 'react';
import { EmptyContainer } from '@/components/custom/EmptyContainer';

interface OrdersForm {
  cartItems: CartItemsProducts[];
  carts: Carts[];
}

export function Orders({ cartItems, carts }: OrdersForm): JSX.Element {
  return (
    <div>
      <Button className="float-right">
        <ShoppingCart />
        Complete Order
      </Button>
      <section className="flex w-full gap-2">
        <div className="flex-4">
          <OrdersTable cartItems={cartItems as CartItemsProducts[]} />
        </div>
        <div className="flex-2">
          <OrdersCard carts={carts as Carts[]} />
          {carts.length <= 0 && <EmptyContainer />}
        </div>
      </section>
    </div>
  );
}
