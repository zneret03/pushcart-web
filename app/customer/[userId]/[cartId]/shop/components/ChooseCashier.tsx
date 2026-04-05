'use client';

import { Users } from '@/lib/types/users';
import { updateCart } from '@/services/cart/cart.services';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { JSX } from 'react';

interface ChooseCashierType {
  userProfiles: Users[];
  cartId: string;
  currentCashier: string;
  userId: string;
}

export const ChooseCashier = ({
  userProfiles,
  cartId,
  currentCashier,
  userId,
}: ChooseCashierType): JSX.Element => {
  const router = useRouter();

  const onUpdateCashier = async (id: string): Promise<void> => {
    await updateCart(id, cartId);
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2">
      {userProfiles.map((item: Users, index: number) => (
        <Button
          variant={item.id === currentCashier ? 'default' : 'secondary'}
          key={item.id}
          className="cursor-pointer"
          onClick={() => onUpdateCashier(item.id)}
        >
          cashier {index + 1}
          {item.id === currentCashier && <Check />}
        </Button>
      ))}

      {currentCashier !== userId && (
        <span
          onClick={() => onUpdateCashier(userId)}
          className="float-right cursor-pointer font-bold hover:underline"
        >
          clear
        </span>
      )}
    </div>
  );
};
