import { validationErrorNextResponse } from '@/app/api/helpers/response';
import { revokeUser, updateUserInfo } from '@/app/api/model/profiles';
import { isEmpty } from 'lodash';
import { NextRequest } from 'next/server';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const body = await req.json();
  const { id: userId } = await params;

  if (isEmpty(body)) {
    return validationErrorNextResponse();
  }

  if (body.type === 'banned-until') {
    return revokeUser(body, userId);
  }

  if (body.type === 'update-user-info') {
    return updateUserInfo(body, userId);
  }
}
