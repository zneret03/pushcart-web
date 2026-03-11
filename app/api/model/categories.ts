import { CategoriesInsert } from '@/lib/types/categories';
import { generalErrorResponse, successResponse } from '../helpers/response';
import { SubCategories } from '@/lib/types/categories';
import { createClient } from '@/config';

export const addCategory = async (data: CategoriesInsert) => {
  try {
    const supabase = await createClient();

    const newData = {
      name: data?.name,
      description: data?.description,
    };

    const { error } = await supabase.from('categories').insert(newData);

    if (error) {
      return generalErrorResponse({ error: error.message });
    }

    return successResponse({
      message: 'Successfuly added category',
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
};

export const addSubcategories = async (data: SubCategories) => {
  try {
    const supabase = await createClient();

    const newData = {
      parent_id: data?.parent_id,
      name: data?.name,
      description: data?.description,
    };

    const { error } = await supabase.from('categories').insert(newData);

    if (error) {
      return generalErrorResponse({ error: error.message });
    }

    return successResponse({
      message: 'Successfuly added sub category',
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
};

export const editCategory = async (
  data: { [key: string]: string | Date },
  id: string,
) => {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('categories')
      .update(data)
      .eq('id', id);

    if (error) {
      return generalErrorResponse({ error: error.message });
    }

    return successResponse({
      message: 'Successfuly updated category',
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
};
