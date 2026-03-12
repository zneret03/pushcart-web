import { JSX } from 'react';
import { ProductsTable } from './components/ProductsTable';
import { Container } from '@/components/custom/Container';
import { getProducts } from '@/services/products/product.services';
import { getCategories } from '@/services/categories/categories.services';

import { DeleteProductDialog } from './components/dialogs/DeleteProducts';
import { ProductsDialog } from './components/dialogs/ProductDialog';
import { EditProductsDialog } from './components/dialogs/EditProductDialog';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page: string; search: string }>;
}): Promise<JSX.Element> {
  const { page, search } = await searchParams;

  const responseCategories = await getCategories(
    `?page=1&perPage=10&search=${search}&sortBy=created_at`,
  );

  const response = await getProducts(
    `?page=${page || 1}&perPage=10&search=${search}&sortBy=created_at`,
  );

  return (
    <Container
      title="Products"
      description="All added products can be seen here"
    >
      <ProductsTable
        {...{
          products: response?.products,
          totalPages: response?.totalPages,
          currentPage: response?.currentPage,
          count: response?.count,
        }}
      />

      <ProductsDialog categories={responseCategories.categories} />
      <EditProductsDialog categories={responseCategories.categories} />
      <DeleteProductDialog />
    </Container>
  );
}
