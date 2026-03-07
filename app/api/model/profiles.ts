import {
  generalErrorResponse,
  successResponse,
  conflictRequestResponse,
} from '../helpers/response';
import { getImagePath } from './image';
import { uploadFileImage } from '../helpers/uploadImage';
import { createClient } from '@/config';
import { removeImageViaPath } from './image';

export const signUp = async (data: FormData) => {
  try {
    const avatar_url = data.get('avatar_url');
    const email = data.get('email');
    const password = data.get('password');
    const first_name = data.get('first_name');
    const last_name = data.get('last_name');
    const middle_name = data.get('middle_name');
    const address = data.get('address');
    const role = data.get('role');

    const supabase = await createClient();

    const image = await uploadFileImage(
      [avatar_url] as File[],
      email as string,
      'avatar',
    );

    const { error: userErrorEmail, data: userEmailDetails } =
      await supabase.auth.admin.createUser({
        email: email as string,
        password: password as string,
        email_confirm: true,
        user_metadata: {
          role: role,
        },
      });

    const newData = {
      id: userEmailDetails?.user?.id,
      avatar_url: image,
      first_name,
      last_name,
      middle_name,
      address,
      email,
      role,
    };

    if (userErrorEmail) {
      if (typeof avatar_url === 'string') {
        removeImageViaPath(supabase, getImagePath(avatar_url as string));
      }
      return conflictRequestResponse({
        error: userErrorEmail?.message,
      });
    }

    const { error } = await supabase
      .from('profiles')
      .upsert(newData, { onConflict: 'id' });

    if (error) {
      if (typeof image === 'string') {
        removeImageViaPath(supabase, getImagePath(avatar_url as string));
      }
      return generalErrorResponse({ error });
    }

    return successResponse({
      message: 'Successfully added product',
      id: userEmailDetails.user.id,
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
};
