import { NextRequest } from 'next/server';
import { validationErrorNextResponse } from '../../../helpers/response';
import { editVat } from '@/app/api/model/vat';
import { isEmpty } from 'lodash';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();

  if (isEmpty(body)) {
    return validationErrorNextResponse();
  }

  if (body.type === 'edit-vat') {
    const { type, ...rest } = body;
    return editVat(rest, id);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const today = new Date();

  if (!id) {
    return validationErrorNextResponse();
  }

  return editVat({ archived_at: today }, id);
}
