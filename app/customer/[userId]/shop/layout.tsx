import { ReactNode } from 'react';
import { CustomerNavigation } from '@/components/custom/CustomerNavigation';

export default async function LayoutUser({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div>
      <CustomerNavigation />
      {children}
    </div>
  );
}
