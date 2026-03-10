import { Spinner } from '@/components/custom/Spinner';
import { JSX } from 'react';

export default function Loading(): JSX.Element {
  return (
    <div className="flex h-[85vh] items-center justify-center">
      <Spinner />
    </div>
  );
}
