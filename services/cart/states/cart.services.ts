import { persist } from 'zustand/middleware';
import { createJSONStorage } from 'zustand/middleware';
import { create } from 'zustand';
import { Carts } from '@/lib/types/Carts';

type CartsDialogType = 'add' | 'edit' | 'delete' | null;

export interface CartsDialog {
  open: boolean;
  type: CartsDialogType;
  toggleOpenDialog?: (
    isOpen: boolean,
    type: CartsDialogType,
    data: Carts | null,
  ) => void;
  data: Partial<Carts> | null;
}

const initialState: CartsDialog = {
  data: null,
  open: false,
  type: null,
};

export const useCartsDialog = create<CartsDialog>()(
  persist(
    (set) => ({
      ...initialState,
      toggleOpenDialog: (
        isOpen: boolean,
        type: CartsDialogType,
        data: Carts | null,
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
      name: 'carts-dialog',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
