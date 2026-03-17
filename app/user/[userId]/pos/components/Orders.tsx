'use client';

import { JSX, ReactNode, useState } from 'react';
import { CartItemsProducts, Carts, OrderSteps } from '@/lib/types/Carts';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { OrdersCard } from './OrdersCards';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrdersTable } from './OrdersTable';
import { TabsContainer } from '@/components/custom/Tabs';
import { EmptyContainer } from '@/components/custom/EmptyContainer';
import { MenuOptions } from '@/lib/types/MenuOptions';
import { calculateCartTotal } from '../helpers/calculateCartTotal';
import { formatCurrency } from '@/helpers/formatAmountPh';

interface OrdersForm {
  cartItems: CartItemsProducts[];
  carts: Carts[];
}

export function Orders({ cartItems, carts }: OrdersForm): JSX.Element {
  const [currentStep, setCurrentStep] = useState<OrderSteps>('calculations');

  const tabsOptions: MenuOptions[] = [
    {
      value: 'calculations',
      label: 'Calculations',
    },
    {
      value: 'orders',
      label: 'Orders',
    },
  ];

  const vatTax = 0.12;
  const discount = 0;
  const subTotal = calculateCartTotal(cartItems) - discount;
  const totalPayment = subTotal + vatTax;

  const tabContent: { [key: string]: ReactNode } = {
    calculations: (
      <Card className="w-full max-w-sm border-none shadow-none">
        <CardContent className="space-y-4 pt-6">
          {/* Subtotal Row */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground font-semibold">
              {formatCurrency(subTotal)}
            </span>
          </div>

          {/* Service Tax Row */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Service Tax</span>
            <span className="text-foreground font-semibold">
              {formatCurrency(vatTax)}
            </span>
          </div>

          {/* Discount Row */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Discount</span>
            <span className="text-foreground font-semibold">
              {formatCurrency(discount)}
            </span>
          </div>
        </CardContent>

        <Separator className="my-2" />

        <CardFooter className="flex items-center justify-between py-4">
          <span className="text-foreground text-sm font-bold">
            Total payment
          </span>
          <span className="text-foreground text-lg font-bold">
            {formatCurrency(totalPayment)}
          </span>
        </CardFooter>
      </Card>
    ),
    orders: (
      <div className="flex-2">
        <OrdersCard carts={carts as Carts[]} />
        {carts.length <= 0 && <EmptyContainer />}
      </div>
    ),
  };

  const onChangeSteps = (value: OrderSteps): void => {
    if (value === 'calculations') {
      setCurrentStep(value);
      return;
    }

    setCurrentStep(value);
  };

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
        <TabsContainer
          menuOptions={tabsOptions}
          currentStep={currentStep}
          changeOnClick={(value) => onChangeSteps(value as OrderSteps)}
        >
          {tabContent[currentStep]}
        </TabsContainer>
      </section>
    </div>
  );
}
