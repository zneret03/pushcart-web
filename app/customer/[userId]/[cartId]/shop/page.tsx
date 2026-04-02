import { JSX } from 'react';
import { getProducts } from '@/services/products/product.services';
import { ProductCards } from './components/ProductCards';
import { Container } from '@/components/custom/Container';

export default async function Shop({
  params,
  searchParams,
}: {
  params: Promise<{ cartId: string }>;
  searchParams: Promise<{ page: string; search: string }>;
}): Promise<JSX.Element> {
  const { cartId } = await params;
  const { page, search } = await searchParams;

  const response = await getProducts(
    `?page=${page || 1}&perPage=10&search=${search}&sortBy=created_at`,
  );

  return (
    <Container title="Shops" description="Customers can shops here">
      <main className="flex">
        <section className="flex-2">
          <ProductCards
            {...{
              cartId,
              products: response.products,
              totalPages: response?.totalPages,
              currentPage: response?.currentPage,
              count: response?.count,
            }}
          />
        </section>
        <section className="flex-1">cart</section>
      </main>
    </Container>
  );
}
