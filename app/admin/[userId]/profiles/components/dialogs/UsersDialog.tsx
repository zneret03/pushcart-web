'use client';

import { JSX, useState, useTransition } from 'react';
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Eye, EyeClosed } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CustomButton } from '@/components/custom/CustomButton';
import { useShallow } from 'zustand/react/shallow';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useUserDialog } from '@/services/users/state/user-dialog';
import { Input } from '@/components/ui/input';
import { regularEmailRegex } from '@/helpers/reusableRegex';
import { ImageUpload } from '@/components/custom/ImageUpload';
import { Controller } from 'react-hook-form';
import { signUp } from '@/services/users/users.services';
import { roleTypes } from '../../helpers/constants';
import { UserInsertType } from '@/lib/types/users';

export function UsersDialog(): JSX.Element {
  const [toggleEye, setToggleEye] = useState<boolean>(false);
  const [toggleConfirmPassword, setToggleConfirmPassword] =
    useState<boolean>(false);
  const [isPending, startTransition] = useTransition();
  const {
    handleSubmit,
    formState: { errors },
    control,
    register,
    setError,
  } = useForm<UserInsertType>();

  const router = useRouter();

  const { open, toggleOpen, type } = useUserDialog(
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

  const toggleEyePassword = (): void => {
    setToggleEye((prevState) => !prevState);
  };

  const toggleConfirmEyePassword = (): void => {
    setToggleConfirmPassword((prevState) => !prevState);
  };

  const onSubmit = async (data: UserInsertType): Promise<void> => {
    const { password, confirmPassword } = data;
    startTransition(async () => {
      if (!data.avatar_url) {
        setError('avatar_url', {
          message: 'required field',
        });
        return;
      }

      if (password !== confirmPassword) {
        setError('password', {
          message: 'Password doesnt match',
        });

        setError('confirmPassword', {
          message: 'Password doesnt match',
        });
        return;
      }

      await signUp({ ...data, role: data.role.toLocaleLowerCase() });
      resetVariables();
    });
  };

  const isOpenDialog = open && type === 'add';

  return (
    <Dialog
      open={isOpenDialog}
      onOpenChange={() => toggleOpen?.(false, null, null)}
    >
      <DialogContent className="max-h-[40rem] overflow-auto sm:max-w-[40rem]">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
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

        <div className="grid grid-cols-2 gap-2">
          <Field className="max-w-sm">
            <FieldLabel htmlFor="inline-end-input">Password*</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="inline-end-input"
                type={toggleEye ? 'text' : 'password'}
                placeholder="Enter password"
                {...register('password', {
                  required: 'required field',
                })}
              />
              <InputGroupAddon align="inline-end" onClick={toggleEyePassword}>
                {toggleEye ? (
                  <Eye className="cursor-pointer" />
                ) : (
                  <EyeClosed className="cursor-pointer" />
                )}
              </InputGroupAddon>
            </InputGroup>
            {!!errors.password && (
              <FieldDescription>{errors.password?.message}</FieldDescription>
            )}
          </Field>

          <Field className="max-w-sm">
            <FieldLabel htmlFor="inline-end-input">
              Confirm Password*
            </FieldLabel>
            <InputGroup>
              <InputGroupInput
                type={toggleConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm Password"
                {...register('confirmPassword', {
                  required: 'required field',
                })}
              />
              <InputGroupAddon
                align="inline-end"
                onClick={toggleConfirmEyePassword}
              >
                {toggleConfirmPassword ? (
                  <Eye className="cursor-pointer" />
                ) : (
                  <EyeClosed className="cursor-pointer" />
                )}
              </InputGroupAddon>
            </InputGroup>
            {!!errors.confirmPassword && (
              <FieldDescription>
                {errors.confirmPassword?.message}
              </FieldDescription>
            )}
          </Field>
        </div>

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
            {...register('middle_name')}
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
