import { ReactNode } from 'react';
import { AuthProvider } from '@/context/AuthProvider';

export default async function LayoutUser({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div>
      <AuthProvider>{children}</AuthProvider>
    </div>
  );
}
