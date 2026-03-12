import {
  generalErrorResponse,
  successResponse,
  conflictRequestResponse,
  badRequestResponse,
} from '../helpers/response';
import { getImagePath } from './image';
import { uploadFileImage } from '../helpers/uploadImage';
import { createClient } from '@/config';
import { removeImageViaPath } from './image';
import { UpdateUser } from '@/lib/types/users';

interface RevokeUser {
  banUntil: string;
  archivedAt: Date | null;
}

interface UpdateUserInfo extends UpdateUser {
  oldAvatar: string;
  avatar: string;
}

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
      console.error(error);
      if (typeof image === 'string') {
        removeImageViaPath(supabase, getImagePath(avatar_url as string));
      }

      return generalErrorResponse({ error: error.message });
    }

    return successResponse({
      message: 'Successfully added product',
      id: userEmailDetails.user.id,
    });
  } catch (error) {
    const newError = error as Error;
    console.error(newError);
    return generalErrorResponse({ error: newError.message });
  }
};

export const revokeUser = async (
  { banUntil, archivedAt }: RevokeUser,
  id: string,
) => {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.admin.updateUserById(id, {
      ban_duration: banUntil,
    });

    if (error) {
      return generalErrorResponse({ error: error.message });
    }

    const { error: userError } = await supabase
      .from('profiles')
      .update({
        archived_at: archivedAt,
      })
      .eq('id', id);

    if (userError) {
      return generalErrorResponse({ error: userError.message });
    }

    return successResponse({
      message: 'Successfuly revoked user',
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
};

export const updateUserInfo = async (body: UpdateUserInfo, id: string) => {
  try {
    const supabase = await createClient();
    const isEqualAvatar = body.oldAvatar !== body.avatar && !!body.oldAvatar;
    let imageUrl;

    //remove old avatar
    if (isEqualAvatar) {
      const image = await uploadFileImage(
        [body.avatar_url] as unknown as File[],
        body.email as string,
        'avatar',
      );

      imageUrl = image;
      removeImageViaPath(supabase, getImagePath(body.oldAvatar as string));
    }

    const newData = {
      first_name: body.first_name,
      last_name: body.last_name,
      middle_name: body.last_name,
      address: body.address,
      role: body.role,
      avatar_url: imageUrl,
    };

    const { error: userError } = await supabase
      .from('profiles')
      .update(newData)
      .eq('id', id);

    if (
      userError?.message ===
      'duplicate key value violates unique constraint "users_username_key"'
    ) {
      return conflictRequestResponse({
        error: 'username already exist, please try again.',
      });
    }

    if (userError) {
      if (typeof body.oldAvatar === 'string') {
        removeImageViaPath(supabase, getImagePath(body.oldAvatar as string));
      }
      return badRequestResponse({ error: userError.message || '' });
    }

    return successResponse({
      message: 'Successfully updated user details.',
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
};
