'use client';

import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { CustomButton } from '@/components/custom/CustomButton';
import { useForm, FormProvider } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { SignIn, UserForm } from '@/lib/types/users';
import { Ban } from 'lucide-react';
import { useAuth } from '@/services/auth/states/auth-state';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useShallow } from 'zustand/shallow';
import { anonymouslyLogin } from '@/services/auth/auth.services';

export function CustomerLogin({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const [message, setMessage] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const form = useForm<SignIn>();
  const { handleSubmit } = form;
  const { setUserInfo } = useAuth(
    useShallow((state) => ({ setUserInfo: state.setUserInfo })),
  );

  const router = useRouter();

  const onSubmit = async (): Promise<void> => {
    startTransition(async () => {
      try {
        const data = await anonymouslyLogin();

        setUserInfo(data as UserForm);

        router.push(`/customer/${data?.id}/shop`);
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

          <CustomButton
            isLoading={isPending}
            disabled={isPending}
            type="submit"
            className="w-full cursor-pointer"
          >
            Go to Shop
          </CustomButton>
        </div>
      </form>
    </FormProvider>
  );
}
