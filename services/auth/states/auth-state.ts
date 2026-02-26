import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserForm } from '@/lib/types/users';

export interface UseAuth extends UserForm {
  setUserInfo: (user: UserForm) => void;
  reset: () => void;
}

const initialState: UserForm = {
  first_name: '',
  last_name: '',
  middle_name: '',
  address: '',
  email: '',
  id: '',
  role: '',
};

export const useAuth = create<UseAuth>()(
  persist(
    (set) => ({
      ...initialState,
      setUserInfo: (user: UserForm) => {
        set({
          ...user,
        });
      },
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'use-auth',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
