'use client';

import { JSX } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';

export const PreviousPage = (): JSX.Element => {
  const router = useRouter();

  return (
    <Button variant="ghost" onClick={router.back}>
      <ChevronLeft />
      Back
    </Button>
  );
};
