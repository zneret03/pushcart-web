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
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { SubCategories as SubCategoriesType } from '@/lib/types/categories';
import { addSubcategories } from '@/services/categories/categories.services';
import { useCategoriesDialog } from '@/services/categories/state/categories-state';

export function SubCategories(): JSX.Element {
  const [isPending, startTransition] = useTransition();
  const {
    handleSubmit,
    register,
    formState: { errors },
    reset,
    control,
  } = useForm<SubCategoriesType>();

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
    reset();
    router.refresh();
  };

  const onSubmit = async (data: SubCategoriesType): Promise<void> => {
    startTransition(async () => {
      await addSubcategories(data);
      resetVariables();
    });
  };

  useEffect(() => {
    if (data) {
      reset({
        parent_id: data?.id,
        name: data?.name,
      });
    }
  }, [data]);

  const isOpenDialog = open && type === 'add-subcategories';

  return (
    <Dialog
      open={isOpenDialog}
      onOpenChange={() => toggleOpen?.(false, null, null)}
    >
      <DialogContent className="sm:max-w-[40rem]">
        <DialogHeader>
          <DialogTitle>Add Sub Categories</DialogTitle>
        </DialogHeader>

        <Controller
          name="name"
          control={control}
          render={({ field: { value } }) => (
            <Input
              title="Parent Category"
              placeholder="parent category"
              value={value}
              disabled={true}
              className="cursor-not-allowed"
            />
          )}
        />

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
