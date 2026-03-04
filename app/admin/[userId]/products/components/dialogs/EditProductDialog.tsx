'use client';

import { JSX, useEffect, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { ImageUpload } from '@/components/custom/ImageUpload';
import { Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CustomButton } from '@/components/custom/CustomButton';
import { useShallow } from 'zustand/react/shallow';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { ProductsUpdate } from '@/lib/types/product';
import { editProducts } from '@/services/products/product.services';
import { useProductDialog } from '@/services/products/state/product-dialog';

export function EditProductsDialog(): JSX.Element {
  const [isPending, startTransition] = useTransition();
  const {
    handleSubmit,
    formState: { errors },
    control,
    register,
    reset,
  } = useForm<ProductsUpdate>();

  const router = useRouter();

  const { open, toggleOpen, type, data } = useProductDialog(
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

  const onSubmit = async (productData: ProductsUpdate): Promise<void> => {
    startTransition(async () => {
      const newData = {
        old_image: data?.image_url,
        ...productData,
      };

      editProducts(newData as ProductsUpdate, data?.id as string);
      resetVariables();
    });
  };

  useEffect(() => {
    if (data) {
      reset({
        name: data?.name,
        price: data?.price,
        stock_quantity: data?.stock_quantity,
        image_url: data?.image_url,
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
          <DialogTitle>Edit Product Dialog</DialogTitle>
        </DialogHeader>

        <div className="grid w-full grid-cols-2 gap-4">
          <Input
            title="Name"
            placeholder="product name"
            {...register('name', {
              required: 'this is required',
            })}
            hasError={!!errors.name}
            errorMessage={errors?.name?.message}
          />
          <Input
            type="number"
            title="price"
            placeholder="product price"
            {...register('price', {
              required: 'this is required',
            })}
            hasError={!!errors?.price}
            errorMessage={errors?.price?.message}
          />
        </div>

        <Input
          type="number"
          title="Quantity"
          placeholder="product quantity"
          {...register('stock_quantity', {
            required: 'this is required',
          })}
          hasError={!!errors?.stock_quantity}
          errorMessage={errors?.stock_quantity?.message}
        />

        <div className="space-y-2">
          <Controller
            name="image_url"
            control={control}
            render={({ field: { onChange, value } }) => (
              <ImageUpload
                title="Image"
                filePreview={
                  (typeof value === 'string' && (value as string)) || null
                }
                pendingFiles={value as File[]}
                isLoading={isPending}
                acceptedImageCount={1}
                setPendingFiles={(value) => onChange(value)}
              />
            )}
          />

          {!!errors.image_url && (
            <h1 className="text-sm text-red-500">
              {errors?.image_url?.message}
            </h1>
          )}
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
