import axios from 'axios';
import { axiosService } from '@/app/api/axios-client';
import { toast } from 'sonner';

export const getDashboardStats = async (year: number) => {
  try {
    const response = await axiosService.get(`/api/protected/dashboard/${year}`);

    return response.data.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      console.info(e.response?.data.error);

      toast.error('ERROR!', {
        description: e.response?.data.error,
      });
      throw e.response?.data.error;
    }
  }
};
