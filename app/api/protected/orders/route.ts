import { NextRequest } from 'next/server';
import { addOrders } from '../../model/orders';

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.type === 'add-orders') {
    const { type, ...rest } = body;
    return addOrders(rest);
  }
}
