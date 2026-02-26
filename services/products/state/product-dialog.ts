import { persist } from 'zustand/middleware';
import { createJSONStorage } from 'zustand/middleware';
import { create } from 'zustand';
import { Products } from '@/lib/types/product';

type ProductDialogType = 'add' | 'update' | 'delete' | null;

export type AttendanceData = Products

export interface ProductDialog {
  open: boolean;
  type: ProductDialogType;
  toggleOpenDialog?: (isOpen: boolean, type: ProductDialogType) => void;
}

const initialState: ProductDialog = {
  open: false,
  type: null,
};

export const useProductDialog = create<ProductDialog>()(
  persist(
    (set) => ({
      ...initialState,
      toggleOpenDialog: (isOpen: boolean, type: ProductDialogType) => {
        set((state) => ({
          ...state,
          open: isOpen,
          type,
        }));
      },
    }),
    {
      name: 'product-dialog',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
