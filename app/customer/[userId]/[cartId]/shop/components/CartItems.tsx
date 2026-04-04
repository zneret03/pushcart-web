'use client';

import { useState, useMemo, useCallback } from 'react';
import { CartItemsProducts } from '@/lib/types/Carts';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { deleteCartItems } from '@/services/cart/cart.services';
import { updateCartItemsQuantity } from '@/services/cart/cart.services';
import { X, Plus, Minus } from 'lucide-react';
import { debounce } from 'lodash';
import { toast } from 'sonner';
import { JSX } from 'react';

interface CartItemsType {
  cartItems: CartItemsProducts;
}

export const CartItems = ({ cartItems }: CartItemsType): JSX.Element => {
  const [hover, setHover] = useState<boolean>(false);
  const { products, quantity } = cartItems;

  const router = useRouter();

  const onDeleteCartItems = async (id: string): Promise<void> => {
    await deleteCartItems(id);
    router.refresh();
  };

  const onDebounce = useMemo(
    () =>
      debounce((id: string, delta: number, currentCount: number) => {
        if (currentCount <= 0) {
          toast('Error', {
            description: 'quantity should not be one',
          });
          return;
        }

        updateCartItemsQuantity(currentCount, id);
        router.refresh();
      }, 100),
    [],
  );

  const adjustQuantity = useCallback(
    (id: string, delta: number, currentCount: number) => {
      onDebounce(id, delta, currentCount);
    },
    [onDebounce],
  );

  return (
    <div
      className="flex w-full justify-between gap-2"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <section className="flex gap-2">
        <Image
          src={products.image_url || `/images/empty-food.jpg`}
          width={500}
          height={500}
          alt="sample image"
          className="h-20 w-20 rounded-lg object-cover"
        />
        <div>
          <h1 className="text-xl font-bold">{products.name}</h1>
          <p className="text-gray-500">{products.sku}</p>
          <div className="flex items-center gap-2 text-gray-500">
            Quantity:{' '}
            <div className="flex gap-1">
              <Button
                size="xs"
                onClick={() =>
                  adjustQuantity(cartItems.id, -1, cartItems.quantity - 1)
                }
              >
                <Minus />
              </Button>
              <Badge variant="secondary">{quantity}</Badge>
              <Button
                size="xs"
                onClick={() =>
                  adjustQuantity(cartItems.id, 1, cartItems.quantity + 1)
                }
              >
                <Plus />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {hover && (
        <X
          className="cursor-pointer text-gray-400"
          size={20}
          onClick={() => onDeleteCartItems(cartItems.id)}
        />
      )}
    </div>
  );
};
