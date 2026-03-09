'use client';

import { useUser } from '@/context/AuthProvider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { avatarName } from '@/helpers/avatarName';

export const Navigation = () => {
  const data = useUser();

  return (
    <div className="flex items-center justify-between p-4 shadow-md">
      Hello world
      <section className="flex items-center gap-2">
        <span className="font-medium">{data?.user.email}</span>
        <Avatar className="h-8 w-8 rounded-full">
          <AvatarFallback className="fill-primary bg-primary rounded-lg font-semibold text-white">
            {avatarName(data?.user?.email as string)}
          </AvatarFallback>
        </Avatar>
      </section>
    </div>
  );
};
