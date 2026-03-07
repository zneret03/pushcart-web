import axios from 'axios';
import { axiosService } from '@/app/api/axios-client';
import { UsersInsert } from '@/lib/types/users';
import { toast } from 'sonner';

export const getProfiles = async (params: string) => {
  try {
    const response = await axiosService.get(`/api/protected/profiles${params}`);

    return response.data.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      throw e.response?.data.error;
    }
  }
};

export const signUp = async ({
  avatar_url,
  first_name,
  last_name,
  middle_name,
  role,
  email,
}: UsersInsert) => {
  try {
    const formData = new FormData();
    const newAvatar = avatar_url as File[];
    formData.append('avatar', newAvatar[0]);
    formData.append('first_name', first_name as string);
    formData.append('last_name', last_name as string);
    formData.append('middle_name', middle_name as string);
    formData.append('email', email as string);
    formData.append('role', role as string);
    formData.append('type', 'sign-up');

    const response = await axiosService.post(
      '/api/protected/profiles',
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
