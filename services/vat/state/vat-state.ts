import { persist } from 'zustand/middleware';
import { createJSONStorage } from 'zustand/middleware';
import { create } from 'zustand';
import { Vat } from '@/lib/types/vat';

type VatDialogTypes = 'add' | 'edit' | 'delete' | null;

export interface VatDialog {
  open: boolean;
  type: VatDialogTypes;
  toggleOpenDialog?: (
    isOpen: boolean,
    type: VatDialogTypes,
    data: Vat | null,
  ) => void;
  data: Partial<Vat> | null;
}

const initialState: VatDialog = {
  data: null,
  open: false,
  type: null,
};

export const useVatDialog = create<VatDialog>()(
  persist(
    (set) => ({
      ...initialState,
      toggleOpenDialog: (
        isOpen: boolean,
        type: VatDialogTypes,
        data: Vat | null,
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
      name: 'vat-dialog',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
