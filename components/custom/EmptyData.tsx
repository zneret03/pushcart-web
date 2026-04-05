import Image from 'next/image';

export const EmptyImageData = () => {
  return (
    <div className="flex h-[85vh] flex-col items-center justify-center">
      <Image
        src="/images/error.svg"
        alt="empty placeholder"
        width={900}
        height={900}
        className="size-100"
      />

      <h1 className="text-2xl font-bold">Empty Product</h1>
      <p className="text-sm text-gray-500">There is no product displayed</p>
    </div>
  );
};
