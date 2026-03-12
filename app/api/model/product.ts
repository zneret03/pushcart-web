import { generalErrorResponse, successResponse } from '../helpers/response';
import { uploadFileImage } from '../helpers/uploadImage';
import { createClient } from '@/config';
import { removeImageViaPath, getImagePath } from './image';

export const addProduct = async (data: FormData) => {
  try {
    const image_url = data.get('image_url');
    const name = data.get('name');
    const price = data.get('price');
    const stock_quantity = data.get('stock_quantity');
    const category_id = data.get('category_id');

    const supabase = await createClient();

    const image = await uploadFileImage(
      [image_url] as File[],
      name as string,
      'products',
    );

    const newData = {
      image_url: image,
      name,
      price: Number(price),
      stock_quantity: Number(stock_quantity),
      category_id: category_id,
    };

    const { data: productData, error } = await supabase
      .from('products')
      .insert(newData)
      .single();

    if (error) {
      return generalErrorResponse({ error });
    }

    return successResponse({
      message: 'Successfully added product',
      data: productData,
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
};

export const editProducts = async (
  data: { [key: string]: string | Date },
  id: string,
) => {
  try {
    const supabase = await createClient();

    if (Array.isArray(data.image_url)) {
      removeImageViaPath(supabase, getImagePath(data.old_image as string));
    }

    const newData = {
      name: data?.name,
      sku: data?.sku,
      price: data?.price,
      stock_quantity: data?.stock_quantity,
      image_url: data?.image_url,
    };

    const { error } = await supabase
      .from('products')
      .update(newData)
      .eq('id', id);

    if (error) {
      return generalErrorResponse({ error: error.message });
    }

    return successResponse({
      message: 'Successfuly updated products',
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
};
