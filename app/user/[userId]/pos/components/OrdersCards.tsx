'use client';

import { Carts } from '@/lib/types/Carts';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { usePathname, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { JSX } from 'react';

interface OrdersCards {
  carts: Carts[];
}

export function OrdersCard({ carts }: OrdersCards): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();

  const getCartItemsById = (id: string) => {
    router.replace(`${pathname}?cartId=${id}`);
  };

  return (
    <div className="flex-2">
      {carts?.map((item, index) => (
        <div
          key={item.code_token}
          className="space-y-4 rounded-md p-4 shadow-md transition duration-300 ease-in-out hover:-translate-y-1"
          onClick={() => getCartItemsById(item.id)}
        >
          <h1 className="px-6 text-2xl font-medium">Order {index + 1}</h1>
          <section className="flex cursor-pointer items-center gap-2">
            <Avatar className="h-20 w-20">
              <AvatarImage
                className="object-cover"
                src="/images/avatar.png"
                alt="avatar image"
              />
              <AvatarFallback className="rounded-lg bg-blue-400 fill-blue-500 font-semibold text-white capitalize"></AvatarFallback>
            </Avatar>

            <div>
              <h1 className="font-medium">{item.code_token}</h1>
              <h1>
                {format(
                  item.created_at as string,
                  "MMMM dd, yyyy hh:mm aaaaa'm'",
                )}
              </h1>
            </div>
          </section>
        </div>
      ))}
    </div>
  );
}
