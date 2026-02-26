'use client';

import { JSX, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CustomButton } from '@/components/custom/CustomButton';
import { useShallow } from 'zustand/react/shallow';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Products } from '@/lib/types/product';
import { useProductDialog } from '@/services/products/state/product-dialog';

type ProductForm = Partial<Products> & {
  yearThreshold: number;
};

export function ProductsDialog(): JSX.Element {
  const [isPending, startTransition] = useTransition();
  const { handleSubmit } = useForm<ProductForm>();

  const router = useRouter();

  const { open, toggleOpen, type } = useProductDialog(
    useShallow((state) => ({
      open: state.open,
      type: state.type,
      toggleOpen: state.toggleOpenDialog,
    })),
  );

  const resetVariables = (): void => {
    toggleOpen?.(false, null);
    router.refresh();
  };

  const onSubmit = async (data: ProductForm): Promise<void> => {
    startTransition(async () => {
      // await addAward({ ...data, year: today.getFullYear() });
      resetVariables();
    });
  };

  const isOpenDialog = open && type === 'add';

  return (
    <Dialog open={isOpenDialog} onOpenChange={() => toggleOpen?.(false, null)}>
      <DialogContent className="sm:max-w-[40rem]">
        <DialogHeader>
          <DialogTitle>Product Dialog</DialogTitle>
        </DialogHeader>
        sample field
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>

          <DialogClose asChild>
            <CustomButton
              type="button"
              isLoading={isPending}
              onClick={handleSubmit(onSubmit)}
            >
              Create
            </CustomButton>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
