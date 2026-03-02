import { persist } from 'zustand/middleware';
import { createJSONStorage } from 'zustand/middleware';
import { create } from 'zustand';
import { Products } from '@/lib/types/product';

type ProductDialogType = 'add' | 'edit' | 'delete' | null;

export type AttendanceData = Products;

export interface ProductDialog {
  open: boolean;
  type: ProductDialogType;
  toggleOpenDialog?: (
    isOpen: boolean,
    type: ProductDialogType,
    data: Products | null,
  ) => void;
  data: Partial<Products> | null;
}

const initialState: ProductDialog = {
  data: null,
  open: false,
  type: null,
};

export const useProductDialog = create<ProductDialog>()(
  persist(
    (set) => ({
      ...initialState,
      toggleOpenDialog: (
        isOpen: boolean,
        type: ProductDialogType,
        data: Products | null,
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
      name: 'product-dialog',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
