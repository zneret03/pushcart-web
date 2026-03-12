import { persist } from 'zustand/middleware';
import { createJSONStorage } from 'zustand/middleware';
import { create } from 'zustand';
import { Categories } from '@/lib/types/categories';
import { Products } from '@/lib/types/product';

type ProductDialogType = 'add' | 'edit' | 'delete' | null;

interface ProductDialogWithCategories extends Products {
  categories: Pick<Categories, 'id' | 'name'>;
}

export type AttendanceData = Products;

export interface ProductDialog {
  open: boolean;
  type: ProductDialogType;
  toggleOpenDialog?: (
    isOpen: boolean,
    type: ProductDialogType,
    data: ProductDialogWithCategories | null,
  ) => void;
  data: Partial<ProductDialogWithCategories> | null;
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
        data: ProductDialogWithCategories | null,
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
