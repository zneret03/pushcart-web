import { JSX } from 'react';
import { Container } from '@/components/custom/Container';
import { VatTable } from './components/VatTable';
import { VatDialog } from './components/dialogs/VatDialog';
import { DeleteVatDialog } from './components/dialogs/DeleteVatDialog';
import { EditVatDialog } from './components/dialogs/EditVatDialog';
import { getVat } from '@/services/vat/vat.services';

export default async function Vat({
  searchParams,
}: {
  searchParams: Promise<{ page: string; search: string }>;
}): Promise<JSX.Element> {
  const { page, search } = await searchParams;

  const response = await getVat(
    `?page=${page || 1}&perPage=10&search=${search}&sortBy=created_at`,
  );

  return (
    <Container
      title="Vat"
      description="You can add edit and delete vat taxes here"
    >
      <VatTable
        {...{
          vat: response?.vat || [],
          totalPages: response?.totalPages,
          currentPage: response?.currentPage,
          count: response?.count,
        }}
      />

      <VatDialog />
      <DeleteVatDialog />
      <EditVatDialog />
    </Container>
  );
}
