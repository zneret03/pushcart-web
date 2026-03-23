import axios from 'axios';
import { axiosService } from '@/app/api/axios-client';
import { VatInsert } from '@/lib/types/vat';
import { toast } from 'sonner';

export const getSpecificVat = async () => {
  try {
    const response = await axiosService.get(`/api/protected/vat/all`);

    return response.data.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      throw e.response?.data.error;
    }
  }
};

export const getVat = async (params: string) => {
  try {
    const response = await axiosService.get(`/api/protected/vat${params}`);

    return response.data.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      throw e.response?.data.error;
    }
  }
};

export const addVat = async (
  data: VatInsert,
): Promise<VatInsert | undefined> => {
  try {
    const response = await axiosService.post('/api/protected/vat', {
      ...data,
      type: 'add-vat',
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

export const editVat = async (data: { [key: string]: string | boolean }) => {
  try {
    const response = await axiosService.put(`/api/protected/vat/${data.id}`, {
      ...data,
      type: 'edit-vat',
    });

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

export const deleteVat = async (id: string): Promise<void> => {
  try {
    await axiosService.delete(`/api/protected/vat/${id}`);

    toast('Successfully', {
      description: 'Successfully Delete vat.',
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
