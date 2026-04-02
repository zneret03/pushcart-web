import { ReactNode } from 'react';

export default async function LayoutUser({
  children,
}: {
  children: ReactNode;
}) {
  return <div>{children}</div>;
}
