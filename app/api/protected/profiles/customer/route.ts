import { NextRequest } from 'next/server';
import { signInCustomer } from '@/app/api/model/profiles';

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.type === 'customer-sign-in') {
    return signInCustomer();
  }
}
