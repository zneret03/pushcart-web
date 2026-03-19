import { JSX } from 'react';
import { Container } from '@/components/custom/Container';

export default async function Orders(): Promise<JSX.Element> {
  return (
    <Container title="Orders" description="Users Orders directily here">
      User orders
    </Container>
  );
}
