import axios from 'axios';
import { axiosService } from '@/app/api/axios-client';
import { toast } from 'sonner';
import { Carts } from '@/lib/types/Carts';

export const getCarts = async (): Promise<Carts[] | undefined> => {
  try {
    const response = await axiosService.get('/api/protected/cart');

    return response.data.data as Carts[];
  } catch (e) {
    if (axios.isAxiosError(e)) {
      toast.error('ERROR!', {
        description: e.response?.data.error,
      });
      throw e.response?.data.error;
    }
  }
};

export const getCartItemsById = async (cartId: string): Promise<void> => {
  try {
    const response = await axiosService.get(
      `/api/protected/cart_items/${cartId}`,
    );

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

export const updateCartItemsQuantity = async (
  quantity: number,
  id: string,
): Promise<void> => {
  try {
    const response = await axiosService.put(`/api/protected/cart_items/${id}`, {
      quantity,
      type: 'update-quantity',
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
