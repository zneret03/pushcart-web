import axios from 'axios';
import { axiosService } from '@/app/api/axios-client';
import { ProductsInsert } from '@/lib/types/product';
import { toast } from 'sonner';
import { AxiosResponse } from 'axios';

export const getProducts = async (params: string) => {
  try {
    const response = await axiosService.get(`/api/protected/products${params}`);

    return response.data.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      throw e.response?.data.error;
    }
  }
};

export const addProduct = async (data: ProductsInsert) => {
  try {
    const { name, price, stock_quantity, image_url } = data;

    const formData = new FormData();
    formData.append('image_url', image_url[0]);
    formData.append('name', name);
    formData.append('price', price.toString());
    formData.append('stock_quantity', stock_quantity?.toString() as string);
    formData.append('type', 'add-product');

    const response = await axiosService.post<AxiosResponse<ProductsInsert>>(
      '/api/protected/products',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    toast('Successfully', {
      description: 'Successfully created product',
    });

    return response.data.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      throw e.response?.data.error;
    }
  }
};
