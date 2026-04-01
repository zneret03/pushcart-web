import { JSX } from 'react';
import { Container } from '@/components/custom/Container';

export default async function Shop(): Promise<JSX.Element> {
  return (
    <Container title="Shops" description="Customers can shops here">
      Shops
    </Container>
  );
}
