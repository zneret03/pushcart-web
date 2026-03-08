'use client';

import { JSX, useTransition } from 'react';
import { useUserDialog } from '@/services/users/state/user-dialog';
import { DialogAlert } from '@/components/custom/DialogAlert';
import { useRouter } from 'next/navigation';
import { useShallow } from 'zustand/shallow';
import { revokeOrReinstate } from '@/services/users/users.services';

export function BanUserDialog(): JSX.Element {
  const [isPending, startTransition] = useTransition();

  const { open, type, toggleOpen, data } = useUserDialog(
    useShallow((state) => ({
      open: state.open,
      type: state.type,
      data: state.data,
      toggleOpen: state.toggleOpenDialog,
    })),
  );

  const router = useRouter();
  const today = new Date();

  const resetVariables = (): void => {
    toggleOpen?.(false, null, null);
    router.refresh();
  };

  const onRevokedUser = async (): Promise<void> => {
    startTransition(async () => {
      await revokeOrReinstate(today, '438000h', data?.id as string);
      resetVariables();
    });
  };

  const onReinstateUser = async (): Promise<void> => {
    startTransition(async () => {
      await revokeOrReinstate(null, 'none', data?.id as string);
      resetVariables();
    });
  };

  const isRevoked = type === 'revoked';

  return (
    <DialogAlert
      open={open && ['revoked', 'reinstate'].includes(type as string)}
      title={isRevoked ? 'Revoke User' : 'Reinstate User'}
      description={`Do you want to ${isRevoked ? 'revoke' : 'reinstate'} this user?`}
      callback={isRevoked ? onRevokedUser : onReinstateUser}
      cancel={() => toggleOpen?.(false, null, null)}
      isLoading={isPending}
      type="error"
    />
  );
}
