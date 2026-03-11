import { Container } from '@/components/custom/Container';
import { CategoriesTable } from './components/CategoriesTable';
import { getCategories } from '@/services/categories/categories.services';
import { CategoryDialog } from './components/dialogs/CategoryDialog';
import { SubCategories } from './components/dialogs/SubCategories';
import { JSX } from 'react';

export default async function Categories({
  searchParams,
}: {
  searchParams: Promise<{ page: string; search: string }>;
}): Promise<JSX.Element> {
  const { page, search } = await searchParams;

  const response = await getCategories(
    `?page=${page || 1}&perPage=10&search=${search}&sortBy=created_at`,
  );

  return (
    <Container
      title="Categories"
      description="You can add and see all categories of products here"
    >
      <CategoriesTable
        {...{
          categories: response?.categories || [],
          totalPages: response?.totalPages,
          currentPage: response?.currentPage,
          count: response?.count,
        }}
      />

      <CategoryDialog />
      <SubCategories />
    </Container>
  );
}
