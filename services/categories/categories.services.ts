import axios from 'axios';
import { axiosService } from '@/app/api/axios-client';
import { toast } from 'sonner';
import { CategoriesInsert, SubCategories } from '@/lib/types/categories';

export const getCategories = async (params: string) => {
  try {
    const response = await axiosService.get(
      `/api/protected/categories${params}`,
    );

    return response.data.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      throw e.response?.data.error;
    }
  }
};

export const addCategory = async (
  data: CategoriesInsert,
): Promise<CategoriesInsert | undefined> => {
  try {
    const response = await axiosService.post('/api/protected/categories', {
      ...data,
      type: 'add-category',
    });

    toast('Successfully', {
      description: response.data.message,
    });

    return response.data.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      toast.error('ERROR!', {
        description: e.response?.data.error,
      });
      throw e.response?.data.error;
    }
  }
};

export const addSubcategories = async (
  data: SubCategories,
): Promise<SubCategories | undefined> => {
  try {
    const response = await axiosService.post('/api/protected/categories', {
      ...data,
      type: 'add-subcategories',
    });

    toast('Successfully', {
      description: response.data.message,
    });

    return response.data.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      toast.error('ERROR!', {
        description: e.response?.data.error,
      });
      throw e.response?.data.error;
    }
  }
};

export const deleteCategory = async (id: string): Promise<void> => {
  try {
    await axiosService.delete(`/api/protected/categories/${id}`);

    toast('Successfully', {
      description: 'Successfully Delete categories.',
    });
  } catch (e) {
    if (axios.isAxiosError(e)) {
      toast.error('ERROR!', {
        description: e.response?.data.error,
      });
      throw e.response?.data.error;
    }
  }
};

export const editCategory = async (data: { [key: string]: string }) => {
  try {
    const response = await axiosService.put(
      `/api/protected/categories/${data.id}`,
      {
        name: data.name,
        type: 'edit-categories',
      },
    );

    toast('Successfully', {
      description: response.data.message,
    });
  } catch (e) {
    if (axios.isAxiosError(e)) {
      toast.error('ERROR!', {
        description: e.response?.data.error,
      });
      throw e.response?.data.error;
    }
  }
};
