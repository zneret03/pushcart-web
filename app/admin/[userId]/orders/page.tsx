import { JSX } from 'react';
import { Container } from '@/components/custom/Container';
import { OrdersTable } from './components/OrdersTable';
import { getOrders } from '@/services/orders/orders.services';

export default async function Orders({
  searchParams,
}: {
  searchParams: Promise<{ page: string; search: string }>;
}): Promise<JSX.Element> {
  const { page, search } = await searchParams;

  const response = await getOrders(
    `?page=${page || 1}&perPage=10&search=${search}&sortBy=created_at`,
  );

  return (
    <Container title="Orders" description="Users Orders directily here">
      <OrdersTable
        {...{
          orders: response.orders,
          totalPages: response?.totalPages,
          currentPage: response?.currentPage,
          count: response?.count,
        }}
      />
    </Container>
  );
}
