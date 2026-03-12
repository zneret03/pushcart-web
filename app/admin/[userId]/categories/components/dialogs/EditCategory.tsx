'use client';

import { JSX, useTransition, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CustomButton } from '@/components/custom/CustomButton';
import { useShallow } from 'zustand/react/shallow';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { CategoriesUpdate } from '@/lib/types/categories';
import { editCategory } from '@/services/categories/categories.services';
import { useCategoriesDialog } from '@/services/categories/state/categories-state';

export function EditCategoryDialog(): JSX.Element {
  const [isPending, startTransition] = useTransition();
  const {
    handleSubmit,
    register,
    formState: { errors },
    reset,
  } = useForm<CategoriesUpdate>();

  const router = useRouter();

  const { open, toggleOpen, type, data } = useCategoriesDialog(
    useShallow((state) => ({
      open: state.open,
      type: state.type,
      toggleOpen: state.toggleOpenDialog,
      data: state.data,
    })),
  );

  const resetVariables = (): void => {
    toggleOpen?.(false, null, null);
    router.refresh();
  };

  const onSubmit = async (categoryData: CategoriesUpdate): Promise<void> => {
    startTransition(async () => {
      await editCategory({ ...categoryData, id: data?.id as string } as {
        [key: string]: string;
      });
      resetVariables();
    });
  };

  useEffect(() => {
    if (data) {
      reset({
        name: data?.name,
        description: data?.description,
      });
    }
  }, [data]);

  const isOpenDialog = open && type === 'edit';

  return (
    <Dialog
      open={isOpenDialog}
      onOpenChange={() => toggleOpen?.(false, null, null)}
    >
      <DialogContent className="sm:max-w-[40rem]">
        <DialogHeader>
          <DialogTitle>Edit Category Dialog</DialogTitle>
        </DialogHeader>

        <Input
          title="Name"
          placeholder="Name"
          hasError={!!errors.name}
          errorMessage={errors?.name?.message}
          {...register('name', {
            required: 'field required',
          })}
        />

        <Textarea
          title="Description"
          placeholder="Description"
          hasError={!!errors.description}
          errorMessage={errors?.description?.message}
          {...register('description', {
            required: 'field required',
          })}
        />
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
