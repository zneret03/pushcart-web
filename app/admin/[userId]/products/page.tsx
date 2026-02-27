import { JSX } from 'react';
import { ProductsTable } from './components/ProductsTable';
import { Container } from '@/components/custom/Container';
import { ProductsDialog } from './components/dialogs/ProductDialog';
import { getProducts } from '@/services/products/product.services';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page: string; search: string }>;
}): Promise<JSX.Element> {
  const { page, search } = await searchParams;

  const response = await getProducts(
    `?page=${page || 1}&perPage=10&search=${search}&sortBy=created_at`,
  );

  console.info(response);

  return (
    <Container
      title="Products"
      description="All added products can be seen here"
    >
      <ProductsTable
        {...{ products: [], totalPages: 0, currentPage: 0, count: 0 }}
      />
      <ProductsDialog />
    </Container>
  );
}
