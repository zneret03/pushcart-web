'use client';

import { JSX } from 'react';
import { Button } from '../ui/button';
import { usePathname, useRouter } from 'next/navigation';
import { Pagination as PaginationType } from '@/lib/types/pagination';

export const Pagination = ({
  totalPages,
  currentPage,
}: PaginationType): JSX.Element => {
  const pathname = usePathname();
  const router = useRouter();

  const onNext = (): void => {
    router.replace(`${pathname}?page=${Number(currentPage) + 1}`);
  };

  const onPrevious = (): void => {
    router.replace(`${pathname}?page=${Number(currentPage) - 1}`);
  };

  const disabledNext = currentPage === totalPages;
  const disabledPrevious = currentPage === 1;

  return (
    <div className="flex items-center justify-end space-x-2 py-4">
      <div className="space-x-2">
        <Button
          variant="outline"
          size="sm"
          disabled={disabledPrevious}
          onClick={onPrevious}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={disabledNext}
          onClick={onNext}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
