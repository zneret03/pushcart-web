import axios from 'axios';
import { axiosService } from '@/app/api/axios-client';
import { toast } from 'sonner';

export const getDashboardStats = async () => {
  try {
    const response = await axiosService.get(`/api/protected/dashboard`);

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
