import { JSX } from 'react';
import { UsersDialog } from './components/dialogs/UsersDialog';
import { Container } from '@/components/custom/Container';
import { ProfilesTable } from './components/ProfilesTable';
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

  return (
    <Container title="Profiles" description="You can see all the profiles here">
      <ProfilesTable
        {...{
          profiles: response?.profiles,
          totalPages: response?.totalPages,
          currentPage: response?.currentPage,
          count: response?.count,
        }}
      />

      <UsersDialog />
    </Container>
  );
}
