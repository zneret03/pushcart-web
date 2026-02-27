import { createClient } from '@/config';
import { uploadImage } from '../model/image';
import { generalErrorResponse } from './response';

export const uploadFileImage = async (
  file: File[],
  id: string,
  bucket: string,
) => {
  try {
    const supabase = await createClient();

    const { imageUrls, error } = await uploadImage(
      file,
      supabase,
      id as string,
      bucket,
    );

    if (error) {
      return generalErrorResponse({ error });
    }

    return imageUrls[0];
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
};
