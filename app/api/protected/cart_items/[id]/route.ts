import { validationErrorNextResponse } from '@/app/api/helpers/response';
import { isEmpty } from 'lodash';
import { editCartItems } from '@/app/api/model/cart_items';
import { NextRequest } from 'next/server';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();

  if (isEmpty(body)) {
    return validationErrorNextResponse();
  }

  if (body.type === 'update-quantity') {
    return editCartItems({ quantity: body.quantity }, id);
  }
}
