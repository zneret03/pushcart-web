import { JSX } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardHeader, CardTitle } from '@/components/ui/card';
import { CartItemsProducts } from '@/lib/types/Carts';
import Image from 'next/image';
import { getCartItemsById } from '@/services/cart/cart.services';
import { Container } from '@/components/custom/Container';

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<JSX.Element> {
  const { id } = await params;

  const cartItems = !id ? [] : await getCartItemsById(id, 'paid');

  return (
    <Container
      title="Order Lists"
      description="You can see here all the order lists"
      isBack
    >
      <div className="grid grid-cols-4 gap-2">
        {(cartItems as CartItemsProducts[]).map((item, index) => (
          <Card
            className="relative w-full max-w-sm pt-0"
            key={`${item.products.name}-${index}`}
          >
            <Image
              src={item.products?.image_url as string}
              alt="Event cover"
              width={500}
              height={500}
              className="relative z-20 aspect-video w-full object-cover brightness-80 grayscale dark:brightness-40"
            />
            <CardHeader>
              <CardAction>
                <Badge variant="secondary">
                  {item.carts.status.toUpperCase()}
                </Badge>
              </CardAction>
              <CardTitle>{item.products.name}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </Container>
  );
}
