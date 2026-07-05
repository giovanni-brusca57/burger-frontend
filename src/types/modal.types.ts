import type { ReactNode } from 'react';

export type ModalType = 'create' | 'edit' | 'delete' | 'detail';

export interface ModalConfig {
  type: ModalType;
  title: string;
  description?: string;
  /** Rendered inside the modal body — provide your form or content here */
  content?: ReactNode;
  /** Arbitrary data passed through (useful for delete/detail) */
  data?: unknown;
  /** Called when the confirm/submit button is clicked */
  onConfirm?: () => void | Promise<void>;
  /** Called when the cancel button is clicked (close is always handled by the store) */
  onCancel?: () => void;
  /** Size of the dialog */
  size?: 'sm' | 'default' | 'lg' | 'xl';
}

export interface ModalState extends ModalConfig {
  isOpen: boolean;
  isLoading: boolean;
}

export interface ModalActions {
  open: (config: ModalConfig) => void;
  close: () => void;
  setLoading: (loading: boolean) => void;
}
