import { create } from 'zustand';

type AuthModalMode = 'login' | 'register' | 'forgot-password';

interface AuthModalState {
  open: boolean;
  mode: AuthModalMode;
  prefillRef: string;
  prefillEmail: string;
  showLogin: () => void;
  showRegister: (ref?: string) => void;
  /**
   * Open the forgot-password flow. Optionally pre-fill the email so an
   * authenticated user invoking it from Profile → "Change / Forgot Password"
   * doesn't have to retype their own address.
   */
  showForgotPassword: (email?: string) => void;
  hide: () => void;
}

export const useAuthModalStore = create<AuthModalState>((set) => ({
  open: false,
  mode: 'login',
  prefillRef: '',
  prefillEmail: '',
  showLogin: () => set({ open: true, mode: 'login' }),
  showRegister: (ref = '') => set({ open: true, mode: 'register', prefillRef: ref }),
  showForgotPassword: (email = '') => set({ open: true, mode: 'forgot-password', prefillEmail: email }),
  hide: () => set({ open: false }),
}));
