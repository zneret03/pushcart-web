import { NextRequest } from 'next/server';
import { validationErrorNextResponse } from '../../../helpers/response';
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
