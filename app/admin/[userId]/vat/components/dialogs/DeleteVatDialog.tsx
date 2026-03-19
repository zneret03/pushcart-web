'use client';

import { JSX, useTransition } from 'react';
import { useVatDialog } from '@/services/vat/state/vat-state';
import { DialogAlert } from '@/components/custom/DialogAlert';
import { useRouter } from 'next/navigation';
import { useShallow } from 'zustand/shallow';
import { deleteVat } from '@/services/vat/vat.services';

export function DeleteVatDialog(): JSX.Element {
  const [isPending, startTransition] = useTransition();

  const { open, type, toggleOpen, data } = useVatDialog(
    useShallow((state) => ({
      open: state.open,
      type: state.type,
      data: state.data,
      toggleOpen: state.toggleOpenDialog,
    })),
  );

  const router = useRouter();

  const resetVariables = (): void => {
    toggleOpen?.(false, null, null);
    router.refresh();
  };

  const onDeleteVat = async (): Promise<void> => {
    startTransition(async () => {
      await deleteVat(data?.id as string);
      resetVariables();
    });
  };

  return (
    <DialogAlert
      open={open && type === 'delete'}
      title="Delete Vat?"
      description="Do you want to delete this vat?"
      callback={onDeleteVat}
      cancel={() => toggleOpen?.(false, null, null)}
      isLoading={isPending}
      type="error"
    />
  );
}
