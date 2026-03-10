import { JSX } from 'react';

export default async function PostPage(): Promise<JSX.Element> {
  return (
    <div className="container mx-auto py-12">
      <header>
        <h1 className="text-4xl font-bold">Orders</h1>
        <span className="text-gray-500">all users orders can see here</span>
      </header>
    </div>
  );
}
