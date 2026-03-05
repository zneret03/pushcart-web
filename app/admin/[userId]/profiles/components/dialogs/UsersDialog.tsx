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
import { UsersInsert } from '@/lib/types/users';
import { useUserDialog } from '@/services/users/state/user-dialog';

export function UsersDialog(): JSX.Element {
  const [isPending, startTransition] = useTransition();
  const {
    handleSubmit,
    formState: { errors },
    control,
    register,
  } = useForm<UsersInsert>();

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

  const onSubmit = async (data: UsersInsert): Promise<void> => {
    startTransition(async () => {
      // await addProduct(data);
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
          <DialogTitle>User Dialog</DialogTitle>
        </DialogHeader>
        User add
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
