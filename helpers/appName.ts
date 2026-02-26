import { ShoppingCart } from 'lucide-react';

export const appName = (email: string) => {
  return [
    {
      name: 'Push Cart System',
      logo: ShoppingCart,
      plan: email,
    },
  ];
};
