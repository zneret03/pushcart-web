import { JSX } from 'react';
import { Container } from '@/components/custom/Container';
import { OrderImage } from './components/OrderCard';

export default async function Orders(): Promise<JSX.Element> {
  return (
    <Container title="Orders" description="Users Orders directily here">
      <div>
        <OrderImage />
      </div>
    </Container>
  );
}
