'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JSX } from 'react';
import Image from 'next/image';

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  const router = useRouter();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-[85vh] flex-col items-center justify-center">
      <Image
        src="/images/error.svg"
        alt="empty placeholder"
        width={900}
        height={900}
        className="size-100"
      />
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Something went wrong!</h1>
        <p className="text-sm text-gray-500">
          please contact support if you encounter this page.
        </p>
        <Button className="mt-4" onClick={() => router.back()}>
          <ArrowLeft />
          Go Back
        </Button>
      </div>
    </div>
  );
}
