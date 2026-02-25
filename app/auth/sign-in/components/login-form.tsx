'use client';

import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { CustomButton } from '@/components/custom/CustomButton';
import { useForm, FormProvider } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { SignIn, UserForm } from '@/lib/types/users';
import { Ban } from 'lucide-react';
import { useAuth } from '@/services/auth/states/auth-state';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useShallow } from 'zustand/shallow';
import { signIn } from '@/services/auth/auth.services';

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const [message, setMessage] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const form = useForm<SignIn>();
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = form;
  const { setUserInfo } = useAuth(
    useShallow((state) => ({ setUserInfo: state.setUserInfo })),
  );

  const router = useRouter();

  const onSubmit = async ({ username, password }: SignIn): Promise<void> => {
    startTransition(async () => {
      try {
        const data = await signIn(username as string, password);

        setUserInfo(data as UserForm);

        if (data?.role === 'staff') {
          router.push(`/staff/${data?.id}/users?page=1`);

          return;
        }

        if (data?.role === 'employee') {
          router.push(`/employee/${data?.id}/personal_management`);

          return;
        }

        router.push(`/backend/${data?.id}/dashboard`);
      } catch (error) {
        setMessage(error as string);
      }
    });
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className={cn('flex flex-col gap-6', className)} {...props}>
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold" aria-label="login-title">
              Login to your account
            </h1>
            <p
              className="text-muted-foreground text-sm text-balance"
              aria-label="login-desc"
            >
              Enter your email below to login to your account
            </p>
          </div>

          {message && (
            <Alert className="border-red-500 bg-red-500/20">
              <Ban className="h-4 w-4" />
              <AlertTitle>Note!</AlertTitle>
              <AlertDescription>
                {message === 'Unauthorized'
                  ? 'This account is not registered'
                  : message}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6">
            <Input
              id="username"
              title="Username"
              type="username"
              placeholder="username"
              {...register('username', {
                required: 'field required.',
              })}
              hasError={!!errors.username}
              errorMessage={errors.username?.message as string}
            />
            <div className="grid gap-2">
              <Input
                title="Password"
                id="password"
                type="password"
                placeholder="Password"
                hasError={!!errors.password as boolean}
                errorMessage={errors.password?.message as string}
                {...register('password', {
                  required: 'field required.',
                })}
              />
            </div>
            <CustomButton
              isLoading={isPending}
              disabled={isPending}
              type="submit"
              className="w-full cursor-pointer"
            >
              Login
            </CustomButton>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
