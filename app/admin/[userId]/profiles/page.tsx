import { Container } from '@/components/custom/Container';
import { ProfilesTable } from './components/ProfilesTable';
import { JSX } from 'react';
import { getProfiles } from '@/services/users/users.services';

export default async function Profiles({
  searchParams,
}: {
  searchParams: Promise<{ page: string; search: string }>;
}): Promise<JSX.Element> {
  const { page, search } = await searchParams;

  const response = await getProfiles(
    `?page=${page || 1}&perPage=10&search=${search}&sortBy=created_at`,
  );

  console.log(response);

  return (
    <Container title="Profiles" description="You can see all the profiles here">
      <ProfilesTable
        {...{
          profiles: [],
          totalPages: 0,
          currentPage: 0,
          count: 0,
        }}
      />
    </Container>
  );
}
