import { create } from 'zustand';
import type { ModalState, ModalActions, ModalConfig } from '@/types/modal.types';

const DEFAULT_STATE: Omit<ModalState, keyof ModalActions> = {
  isOpen: false,
  isLoading: false,
  type: 'create',
  title: '',
  description: undefined,
  content: undefined,
  data: undefined,
  onConfirm: undefined,
  onCancel: undefined,
  size: 'default',
};

export const useModalStore = create<ModalState & ModalActions>((set) => ({
  ...DEFAULT_STATE,

  open: (config: ModalConfig) =>
    set({
      isOpen: true,
      isLoading: false,
      ...config,
    }),

  close: () =>
    set({
      ...DEFAULT_STATE,
    }),

  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));
