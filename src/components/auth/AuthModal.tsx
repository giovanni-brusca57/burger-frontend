import { useAuthModalStore } from '@/stores/auth-modal.store';
import { useAuthStore } from '@/stores/auth.store';

import { LoginModal } from './LoginModal';
import { RegisterModal } from './RegisterModal';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { MyWalletModal } from './MyWalletModal';

/**
 * Unified auth modal — switches between Login, Register, ForgotPassword,
 * and My Wallet views based on auth state and modal mode.
 * Open via `useAuthModalStore().showLogin()` or `.showRegister(ref?)`.
 * Mount once in AppLayout.
 */
export function AuthModal() {
  const { mode, open } = useAuthModalStore();
  const { isAuthenticated, user } = useAuthStore();

  // Forgot-password takes precedence over MyWalletModal — an authenticated
  // user invoking "Change / Forgot Password" from Profile expects to see the
  // reset flow, not their wallet info.
  if (mode === 'forgot-password' && open) return <ForgotPasswordModal />;
  if (isAuthenticated && user) return <MyWalletModal />;
  if (mode === 'register') return <RegisterModal />;
  return <LoginModal />;
}
