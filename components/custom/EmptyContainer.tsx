import Image from 'next/image';

export function EmptyContainer() {
  return (
    <div className="space-y-2 text-center">
      <Image
        src="/images/empty.svg"
        width={500}
        height={500}
        className="h-[20rem] w-full"
        alt="empty-image"
      />

      <section className="space-y-2">
        <h1 className="text-2xl font-bold">Orders Empty</h1>
        <span className="text-gray-500">The orders section is empty.</span>
      </section>
    </div>
  );
}
