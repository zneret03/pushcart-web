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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/custom/ImageUpload';
import { Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CustomButton } from '@/components/custom/CustomButton';
import { useShallow } from 'zustand/react/shallow';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { ProductsInsert } from '@/lib/types/product';
import { addProduct } from '@/services/products/product.services';
import { useProductDialog } from '@/services/products/state/product-dialog';
import { CategoriesSubCategories } from '@/services/categories/state/categories-state';

interface ProductDialogTypes {
  categories: CategoriesSubCategories[];
}

export function ProductsDialog({
  categories,
}: ProductDialogTypes): JSX.Element {
  const [isPending, startTransition] = useTransition();
  const {
    handleSubmit,
    formState: { errors },
    control,
    register,
  } = useForm<ProductsInsert>();

  const router = useRouter();

  const categoriesMenu = categories.map((item) => ({
    id: item.id,
    name: item.name,
  }));

  const { open, toggleOpen, type } = useProductDialog(
    useShallow((state) => ({
      open: state.open,
      type: state.type,
      toggleOpen: state.toggleOpenDialog,
    })),
  );

  const resetVariables = (): void => {
    toggleOpen?.(false, null, null);
    router.refresh();
  };

  const onSubmit = async (data: ProductsInsert): Promise<void> => {
    startTransition(async () => {
      await addProduct(data);
      resetVariables();
    });
  };

  const isOpenDialog = open && type === 'add';

  return (
    <Dialog
      open={isOpenDialog}
      onOpenChange={() => toggleOpen?.(false, null, null)}
    >
      <DialogContent className="sm:max-w-[40rem]">
        <DialogHeader>
          <DialogTitle>Product Dialog</DialogTitle>
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

        <div className="grid grid-cols-2 gap-2">
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
            <Label className="mb-1.5 text-sm font-medium">Category*</Label>
            <Controller
              name="category_id"
              control={control}
              render={({ field: { onChange, value } }) => (
                <Select
                  value={value as string}
                  onValueChange={(e) => onChange(e)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesMenu.map((item, index) => (
                      <SelectItem key={`${item}-${index}`} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {!!errors.parent_id && (
              <h1 className="text-sm text-red-500">
                {errors.parent_id.message}
              </h1>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Controller
            name="image_url"
            control={control}
            render={({ field: { onChange, value } }) => (
              <ImageUpload
                title="Image"
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
              Create
            </CustomButton>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
