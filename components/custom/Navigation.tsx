'use client';

import { useUser } from '@/context/AuthProvider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { avatarName } from '@/helpers/avatarName';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/services/auth/auth.services';
import { permanentRedirect } from 'next/navigation';
import { LogOutIcon, ShoppingCart } from 'lucide-react';

export const Navigation = () => {
  const data = useUser();

  const signOutUser = async (): Promise<void> => {
    await signOut();
    permanentRedirect('/auth/sign-in');
  };

  return (
    <div className="flex items-center justify-between p-4 shadow-md">
      <section className="flex items-center gap-2">
        <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-md">
          <ShoppingCart className="size-5" />
        </div>
        <span className="font-medium">PushCart</span>
      </section>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <section className="flex cursor-pointer items-center gap-2">
            <span className="font-medium">{data?.user.email}</span>
            <Avatar className="h-8 w-8 rounded-full">
              <AvatarFallback className="fill-primary bg-primary rounded-lg font-semibold text-white">
                {avatarName(data?.user?.email as string)}
              </AvatarFallback>
            </Avatar>
          </section>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem variant="destructive" onClick={signOutUser}>
            <LogOutIcon />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
