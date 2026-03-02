'use client';

import { JSX, useTransition } from 'react';
import { useProductDialog } from '@/services/products/state/product-dialog';
import { DialogAlert } from '@/components/custom/DialogAlert';
import { useRouter } from 'next/navigation';
import { useShallow } from 'zustand/shallow';
import { deleteProducts } from '@/services/products/product.services';

export function DeleteProductDialog(): JSX.Element {
  const [isPending, startTransition] = useTransition();

  const { open, type, toggleOpen, data } = useProductDialog(
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

  const onDeleteCategories = async (): Promise<void> => {
    startTransition(async () => {
      await deleteProducts(data?.id as string);
      resetVariables();
    });
  };

  return (
    <DialogAlert
      open={open && type === 'delete'}
      title="Delete Product?"
      description="Do you want to delete this product?"
      callback={onDeleteCategories}
      cancel={() => toggleOpen?.(false, null, null)}
      isLoading={isPending}
      type="error"
    />
  );
}
