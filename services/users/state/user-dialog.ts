import { persist } from 'zustand/middleware';
import { createJSONStorage } from 'zustand/middleware';
import { create } from 'zustand';
import { UsersInsert } from '@/lib/types/users';

type UsersDialogType = 'add' | 'edit' | 'revoked' | 'reinstate' | null;

export type UsersData = UsersInsert;

export interface UsersDialog {
  open: boolean;
  type: UsersDialogType;
  toggleOpenDialog?: (
    isOpen: boolean,
    type: UsersDialogType,
    data: UsersInsert | null,
  ) => void;
  data: Partial<UsersInsert> | null;
}

const initialState: UsersDialog = {
  data: null,
  open: false,
  type: null,
};

export const useUserDialog = create<UsersDialog>()(
  persist(
    (set) => ({
      ...initialState,
      toggleOpenDialog: (
        isOpen: boolean,
        type: UsersDialogType,
        data: UsersInsert | null,
      ) => {
        set((state) => ({
          ...state,
          open: isOpen,
          type,
          data,
        }));
      },
    }),
    {
      name: 'user-dialog',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
