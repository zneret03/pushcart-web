import { generalErrorResponse, successResponse } from '../helpers/response';
import { uploadFileImage } from '../helpers/uploadImage';
import { createClient } from '@/config';

export const addProduct = async (data: FormData) => {
  try {
    const image_url = data.get('image_url');
    const name = data.get('name');
    const price = data.get('price');
    const stock_quantity = data.get('stock_quantity');

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

    const { error } = await supabase.from('products').update(data).eq('id', id);

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
