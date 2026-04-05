import { validationErrorNextResponse } from '@/app/api/helpers/response';
import { isEmpty } from 'lodash';
import { addToCart } from '@/app/api/model/cart_items';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (isEmpty(body)) {
    return validationErrorNextResponse();
  }

  const { type, cartId, productId } = body;

  if (type === 'add-to-cart') {
    return addToCart({ cartId, productId });
  }
}
