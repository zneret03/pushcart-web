'use client';

import { useTransition } from 'react';
import { CustomButton } from '@/components/custom/CustomButton';
import { JSX } from 'react';
import { useRouter } from 'next/navigation';
import { updateCartStatus } from '@/services/cart/cart.services';

interface GoToCashierType {
  cartId: string;
  title: string;
  status: 'unpaid' | 'active';
}

export const GoToCashier = ({
  cartId,
  title,
  status,
}: GoToCashierType): JSX.Element => {
  const [isPending, startTransition] = useTransition();

  const router = useRouter();

  const onUpdateCart = async (): Promise<void> => {
    startTransition(async () => {
      await updateCartStatus(status, cartId);
      router.refresh();
    });
  };

  return (
    <CustomButton
      onClick={onUpdateCart}
      isLoading={isPending}
      disabled={isPending}
      className="w-full"
    >
      {title}
    </CustomButton>
  );
};
