import axios from 'axios';
import { AxiosResponse } from 'axios';
import { toast } from 'sonner';
import { UserForm } from '@/lib/types/users';

export const signIn = async (
  email: string,
  password: string,
): Promise<UserForm | undefined> => {
  try {
    const response = await axios.post<AxiosResponse<UserForm>>('/api/auth', {
      email,
      password,
      type: 'sign-in',
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

export const signOut = async (): Promise<void> => {
  try {
    await axios.post('/api/auth', {
      type: 'sign-out',
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
