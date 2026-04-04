'use client';

import { useState } from 'react';
import { CartItemsProducts } from '@/lib/types/Carts';
import Image from 'next/image';
import { X } from 'lucide-react';
import { JSX } from 'react';

interface CartItemsType {
  cartItems: CartItemsProducts;
}

export const CartItems = ({ cartItems }: CartItemsType): JSX.Element => {
  const [hover, setHover] = useState<boolean>(false);
  const { products, quantity } = cartItems;

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
          <p className="text-gray-500">Quantity: {quantity}</p>
        </div>
      </section>

      {hover && <X className="cursor-pointer text-gray-400" size={20} />}
    </div>
  );
};
