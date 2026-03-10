import { NextRequest } from 'next/server';
import { validationErrorNextResponse } from '../../../helpers/response';
import { isEmpty } from 'lodash';
import { editCategory } from '@/app/api/model/categories';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();

  if (isEmpty(body)) {
    return validationErrorNextResponse();
  }

  if (body.type === 'delete-category') {
    return editCategory({ archived_at: body.archivedAt }, id);
  }

  if (body.type === 'edit-categories') {
    return editCategory({ name: body.name }, id);
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

  return editCategory({ archived_at: today }, id);
}
