'use client';

import { JSX, useMemo, useTransition, useState } from 'react';
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
import { EmptyImageData } from '@/components/custom/EmptyData';
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
  const [activeIndex, setActiveIndex] = useState<number>(0);
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
      router.refresh();
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
                onClick={() => {
                  setActiveIndex(index);
                  onAddToCart(cartId, item.id);
                }}
                isLoading={isPending && index === activeIndex}
                disabled={isPending && index === activeIndex}
              >
                Add To Cart
              </CustomButton>
            </CardFooter>
          </Card>
        ))}
      </div>

      {products.length <= 0 && <EmptyImageData />}

      {products.length > 0 && (
        <Pagination {...{ totalPages, currentPage, count }} />
      )}
    </main>
  );
};
