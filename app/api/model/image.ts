import { SupabaseClient } from '@supabase/supabase-js';
import {
  conflictRequestResponse,
  generalErrorResponse,
} from '../helpers/response';
import { NextResponse } from 'next/server';

export const removeImageViaPath = async (
  supabase: SupabaseClient,
  path: string,
  bucket = 'avatars',
): Promise<void | NextResponse> => {
  try {
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (uploadError) {
      return generalErrorResponse({
        error: `Image remove failed: ${uploadError.message}`,
      }) as NextResponse;
    }
  } catch (error) {
    return generalErrorResponse({ error: error }) as NextResponse;
  }
};

export const uploadImage = async (
  images: File[],
  supabase: SupabaseClient,
  id: string,
  bucket = 'avatars',
  contentType = 'image/png',
): Promise<{ imageUrls: string[]; error: NextResponse }> => {
  const imageUrls: string[] = [];
  let error: NextResponse | null = null;

  if (images && images.length > 0) {
    for (const image of images) {
      const fileName = image?.name as string;
      const storageName = `${id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storageName, image, {
          contentType: contentType,
        });

      if (uploadError?.message === 'The resource already exists') {
        error = conflictRequestResponse({ error: uploadError?.message });
      }

      if (uploadError) {
        error = generalErrorResponse({
          error: uploadError.message,
        }) as NextResponse;
      }

      // Get public URL for the uploaded image
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(storageName);

      imageUrls.push(publicUrl);
    }
  }

  return {
    imageUrls,
    error: error as NextResponse,
  };
};

export const removeImage = async (
  images: File[],
  supabase: SupabaseClient,
  id: string,
  bucket = 'avatars',
): Promise<void | NextResponse> => {
  if (images && images.length > 0) {
    for (const image of images) {
      const fileName = image?.name as string;
      const storageName = `${id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .remove([storageName]);

      if (uploadError) {
        return generalErrorResponse({
          error: `Image remove failed: ${uploadError.message}`,
        }) as NextResponse;
      }
    }
  }
};

export const getImagePath = (path: string): string => {
  const formatPath = path?.split('/');
  return decodeURIComponent(`${formatPath[8]}/${formatPath[9]}`);
};
