'use client';

import { JSX } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { parentPath } from '@/helpers/parentPath';

interface ShowMore {
  pagePath: string;
  title: string;
}

export function ShowMore({ pagePath, title }: ShowMore): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();

  const toggleShow = (): void => {
    router.replace(`${parentPath(pathname)}/${pagePath}`);
  };
  return (
    <Button
      className="w-full cursor-pointer"
      variant="outline"
      onClick={toggleShow}
    >
      {title}
    </Button>
  );
}
