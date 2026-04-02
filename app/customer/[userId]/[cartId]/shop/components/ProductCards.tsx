'use client';

import { JSX, useMemo, useTransition } from 'react';
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { CustomButton } from '@/components/custom/CustomButton';
import { usePathname, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Products } from '@/lib/types/product';
import { Pagination as PaginationType } from '@/lib/types/pagination';
import { Pagination } from '@/components/custom/Pagination';
import { Input } from '@/components/ui/input';
import { addToCart } from '@/services/cart/cart.services';
import { debounce } from 'lodash';
import Image from 'next/image';

interface ProductCardsTypes extends PaginationType {
  cartId: string;
  products: Products[];
}

export const ProductCards = ({
  cartId,
  products,
  totalPages,
  currentPage,
  count,
}: ProductCardsTypes): JSX.Element => {
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const router = useRouter();

  const onDebounce = useMemo(
    () =>
      debounce((value) => {
        if (value) {
          router.replace(`${pathname}?page=${currentPage}&search=${value}`);
          return;
        }

        router.replace(`${pathname}?page=${currentPage}`);
      }, 500),
    [pathname, router, currentPage],
  );

  const onSearch = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const { value } = event.target;
    onDebounce(value);
  };

  const onAddToCart = (cartId: string, productId: string): void => {
    startTransition(async () => {
      await addToCart(cartId, productId);
    });
  };

  return (
    <main className="space-y-2">
      <Input
        placeholder="Search user by product by name"
        onChange={(event) => onSearch(event)}
        className="max-w-sm"
      />
      <div className="grid grid-cols-3 gap-2">
        {products.map((item, index) => (
          <Card className="relative w-full pt-0" key={item.id}>
            <Image
              src={(item.image_url as string) || '/images/empty-food.jpg'}
              alt={item.name + '-image'}
              width={500}
              height={500}
              className="relative z-20 aspect-video w-full rounded-t-md object-cover brightness-8"
            />
            <CardHeader>
              <CardAction>
                <Badge variant="secondary">{item.price}</Badge>
              </CardAction>
              <CardTitle>{item.name}</CardTitle>
            </CardHeader>

            <CardFooter>
              <CustomButton
                className="w-full"
                onClick={() => onAddToCart(cartId, item.id)}
                isLoading={isPending}
                disabled={isPending}
              >
                Add To Cart
              </CustomButton>
            </CardFooter>
          </Card>
        ))}
      </div>

      {products.length <= 0 && (
        <div className="flex h-[85vh] flex-col items-center justify-center">
          <Image
            src="/images/error.svg"
            alt="empty placeholder"
            width={900}
            height={900}
            className="size-100"
          />

          <h1 className="text-2xl font-bold">Empty Product</h1>
          <p className="text-sm text-gray-500">There is no product displayed</p>
        </div>
      )}

      {products.length > 0 && (
        <Pagination {...{ totalPages, currentPage, count }} />
      )}
    </main>
  );
};
