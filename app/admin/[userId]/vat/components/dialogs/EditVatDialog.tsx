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
import { Button } from '@/components/ui/button';
import { CustomButton } from '@/components/custom/CustomButton';
import { useShallow } from 'zustand/react/shallow';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { VatUpdate } from '@/lib/types/vat';
import { useVatDialog } from '@/services/vat/state/vat-state';
import { Controller } from 'react-hook-form';
import { Switch } from '@/components/ui/switch';
import { editVat } from '@/services/vat/vat.services';

export function EditVatDialog(): JSX.Element {
  const [isPending, startTransition] = useTransition();
  const {
    handleSubmit,
    register,
    formState: { errors },
    control,
    reset,
  } = useForm<VatUpdate>();

  const router = useRouter();

  const { open, toggleOpen, type, data } = useVatDialog(
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
    reset();
  };

  const onSubmit = async (vatData: VatUpdate): Promise<void> => {
    startTransition(async () => {
      await editVat({ ...vatData, id: data?.id as string } as unknown as {
        [key: string]: string;
      });
      resetVariables();
    });
  };

  useEffect(() => {
    if (data) {
      reset({
        name: data?.name,
        rate: data?.rate,
        is_active: data?.is_active,
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
          <DialogTitle>Category Dialog</DialogTitle>
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

        <Input
          type="number"
          title="Rate"
          placeholder="rate"
          hasError={!!errors.rate}
          errorMessage={errors?.rate?.message}
          {...register('rate', {
            required: 'field required',
          })}
        />

        <div className="flex items-center gap-2">
          <span className="text-md font-medium">Active</span>
          <Controller
            name="is_active"
            control={control}
            render={({ field: { onChange, value } }) => (
              <Switch checked={value} onCheckedChange={(e) => onChange(e)} />
            )}
          />
        </div>

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
              Update
            </CustomButton>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
