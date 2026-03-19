import axios from 'axios';
import { axiosService } from '@/app/api/axios-client';
import { toast } from 'sonner';
import { OrdersInsert } from '@/lib/types/Orders';

export const addOrders = async (
  data: OrdersInsert,
): Promise<OrdersInsert | undefined> => {
  try {
    const response = await axiosService.post('/api/protected/orders', {
      ...data,
      type: 'add-orders',
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
