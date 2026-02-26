import { NextRequest } from 'next/server';
import { validationErrorNextResponse } from '../helpers/response';
import { isEmpty } from 'lodash';
import { signIn, signOut } from './model/auth';

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (isEmpty(body)) {
    return validationErrorNextResponse();
  }

  if (body.type === 'sign-out') {
    return signOut();
  }

  if (body.type === 'sign-in') {
    return signIn(body);
  }
}
