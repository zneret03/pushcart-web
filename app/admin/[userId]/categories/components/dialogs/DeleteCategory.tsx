'use client';

import { JSX, useTransition } from 'react';
import { DialogAlert } from '@/components/custom/DialogAlert';
import { useRouter } from 'next/navigation';
import { useShallow } from 'zustand/shallow';
import { useCategoriesDialog } from '@/services/categories/state/categories-state';
import { deleteCategory } from '@/services/categories/categories.services';

export function DeleteCategoryDialog(): JSX.Element {
  const [isPending, startTransition] = useTransition();

  const { open, type, toggleOpen, data } = useCategoriesDialog(
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
      await deleteCategory(data?.id as string);
      resetVariables();
    });
  };

  return (
    <DialogAlert
      open={open && type === 'delete'}
      title="Delete Category?"
      description="Do you want to delete this category?"
      callback={onDeleteCategories}
      cancel={() => toggleOpen?.(false, null, null)}
      isLoading={isPending}
      type="error"
    />
  );
}
