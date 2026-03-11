import { persist } from 'zustand/middleware';
import { createJSONStorage } from 'zustand/middleware';
import { create } from 'zustand';
import { Categories } from '@/lib/types/categories';

type CategoriesDialogType =
  | 'add'
  | 'add-subcategories'
  | 'edit'
  | 'delete'
  | null;

export type AttendanceData = Categories;

export interface CategoriesDialog {
  open: boolean;
  type: CategoriesDialogType;
  toggleOpenDialog?: (
    isOpen: boolean,
    type: CategoriesDialogType,
    data: Categories | null,
  ) => void;
  data: Partial<Categories> | null;
}

const initialState: CategoriesDialog = {
  data: null,
  open: false,
  type: null,
};

export const useCategoriesDialog = create<CategoriesDialog>()(
  persist(
    (set) => ({
      ...initialState,
      toggleOpenDialog: (
        isOpen: boolean,
        type: CategoriesDialogType,
        data: Categories | null,
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
      name: 'categories-dialog',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
