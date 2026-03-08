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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CustomButton } from '@/components/custom/CustomButton';
import { useShallow } from 'zustand/react/shallow';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { UsersInsert } from '@/lib/types/users';
import { useUserDialog } from '@/services/users/state/user-dialog';
import { Input } from '@/components/ui/input';
import { regularEmailRegex } from '@/helpers/reusableRegex';
import { ImageUpload } from '@/components/custom/ImageUpload';
import { Controller } from 'react-hook-form';
import { signUp } from '@/services/users/users.services';
import { roleTypes } from '../../helpers/constants';

export function EditUserDialog(): JSX.Element {
  const [isPending, startTransition] = useTransition();
  const {
    handleSubmit,
    formState: { errors },
    control,
    register,
    setError,
    reset,
  } = useForm<UsersInsert>();

  const router = useRouter();

  const { open, toggleOpen, type, data } = useUserDialog(
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

  const onSubmit = async (data: UsersInsert): Promise<void> => {
    startTransition(async () => {
      if (!data.avatar_url) {
        setError('avatar_url', {
          message: 'required field',
        });
        return;
      }

      await signUp({ ...data, role: data.role.toLocaleLowerCase() });
      resetVariables();
    });
  };

  useEffect(() => {
    if (!!data) {
      reset({
        email: data.email as string,
        first_name: data.first_name as string,
        role: data.role,
        last_name: data.last_name as string,
        middle_name: data.middle_name as string,
        address: data.address as string,
        avatar_url: data.avatar_url as string,
      });
    }
  }, [data, reset]);

  const isOpenDialog = open && type === 'edit';

  return (
    <Dialog
      open={isOpenDialog}
      onOpenChange={() => toggleOpen?.(false, null, null)}
    >
      <DialogContent className="sm:max-w-[40rem]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>

        <Input
          title="Email"
          placeholder="Email"
          hasError={!!errors.email}
          errorMessage={errors.email?.message}
          {...register('email', {
            required: 'required field',
            pattern: {
              value: regularEmailRegex,
              message: 'invalid email address',
            },
          })}
        />

        <div className="grid grid-cols-3 gap-2">
          <Input
            title="First Name"
            hasError={!!errors.first_name}
            errorMessage={errors.first_name?.message}
            placeholder="First Name"
            {...register('first_name', {
              required: 'required field',
            })}
          />
          <Input
            title="Last Name"
            placeholder="Last Name"
            hasError={!!errors.last_name}
            errorMessage={errors.last_name?.message}
            {...register('last_name', {
              required: 'required field',
            })}
          />
          <Input
            title="Middle Name"
            placeholder="Middle Name"
            hasError={!!errors.middle_name}
            errorMessage={errors.middle_name?.message}
            {...register('middle_name', {
              required: 'required field',
            })}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input
            title="Address"
            placeholder="Address"
            hasError={!!errors.address}
            errorMessage={errors.address?.message}
            {...register('address', {
              required: 'required field',
            })}
          />
          <div className="space-y-2">
            <Label className="mb-1.5 text-sm font-medium">Role*</Label>
            <Controller
              name="role"
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
                    {roleTypes.map((item, index) => (
                      <SelectItem key={`${item}-${index}`} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {!!errors.role && (
              <h1 className="text-sm text-red-500">{errors.role.message}</h1>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Controller
            name="avatar_url"
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
          {!!errors.avatar_url && (
            <h1 className="text-sm text-red-500">
              {errors?.avatar_url?.message}
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
