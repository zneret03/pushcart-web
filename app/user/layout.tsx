import { ReactNode } from 'react';
import { AuthProvider } from '@/context/AuthProvider';
import { Navigation } from '@/components/custom/Navigation';

export default async function LayoutUser({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div>
      <AuthProvider>
        <Navigation />
        {children}
      </AuthProvider>
    </div>
  );
}
