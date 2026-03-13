import { updateUserInfo } from '@/app/api/model/profiles';
import { NextRequest } from 'next/server';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const body = await req.formData();
  const { id: userId } = await params;

  if (body.get('type') === 'update-user-info') {
    return updateUserInfo(body, userId);
  }
}
