import { NextRequest } from 'next/server';
import { validationErrorNextResponse } from '../../../helpers/response';
import { isEmpty } from 'lodash';
import { editProducts } from '@/app/api/model/product';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const today = new Date();

  if (!id) {
    return validationErrorNextResponse();
  }

  return editProducts({ archived_at: today }, id);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();

  if (isEmpty(body)) {
    return validationErrorNextResponse();
  }

  if (body.type === 'edit-products') {
    return editProducts(body, id);
  }
}
