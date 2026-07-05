import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { AuthModal } from '@/components/auth/AuthModal';
import { useAuthStore } from '@/stores/auth.store';
import { Header } from './Header';
import { Footer } from './Footer';
import { BottomNav } from './BottomNav';
import { AppMenuDrawer } from './AppMenuDrawer';
import { WithdrawalNotificationContainer } from '@/components/wallet/WithdrawalNotificationContainer';
import { useWithdrawalNotificationStore } from '@/stores/withdrawalNotifications.store';
import { useFeatureFlagsStore } from '@/stores/featureFlags.store';

/**
 * Root authenticated layout — ark.pro style (no sidebar).
 *
 * Desktop:  Sticky header (logo + nav links) · content · footer
 * Mobile:   Sticky header · content · footer · fixed bottom tab bar
 * Both:     Grid button in header opens right-side community drawer
 *
 * ```
 * ┌─────────────────────────────────────┐
 * │ Header  (sticky)                    │
 * ├─────────────────────────────────────┤
 * │ <Outlet />  (page content)          │
 * ├─────────────────────────────────────┤
 * │ Footer                              │
 * └─────────────────────────────────────┘
 *   [mobile bottom tabs — fixed]
 * ```
 */
export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated } = useAuthStore();

  // The page scroller is <main> (not window). Reset it on every route change —
  // otherwise the previous page's scroll offset carries over and the new page
  // opens mid-way down.
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  // Bootstrap in-flight withdrawal notifications on app mount / login.
  // The store dedupes by ID, polls automatically, and self-stops when idle.
  const bootstrapWithdrawals = useWithdrawalNotificationStore((s) => s.bootstrap);
  const clearWithdrawals = useWithdrawalNotificationStore((s) => s.clear);
  useEffect(() => {
    if (isAuthenticated) {
      bootstrapWithdrawals();
    } else {
      clearWithdrawals();
    }
  }, [isAuthenticated, bootstrapWithdrawals, clearWithdrawals]);

  // Pre-fetch feature flags before any FeatureGate evaluates — closes the
  // first-render flash where a disabled page briefly appears before the
  // store hydrates. Refetched when auth changes so admin-specific responses
  // (if BE adds any later) stay fresh.
  const fetchFlags = useFeatureFlagsStore((s) => s.fetchAll);
  useEffect(() => {
    // Only fetch when authenticated — /feature-flags is auth-gated and an
    // unauth 401 here triggers the axios interceptor's showLogin(), which
    // would override an in-progress showRegister(ref) on referral landings.
    if (isAuthenticated) fetchFlags();
  }, [fetchFlags, isAuthenticated]);

  // Not authenticated → show only the auth screen (login/register/forgot), nothing behind it
  if (!isAuthenticated) {
    return (
      <TooltipProvider>
        <AuthModal />
        <Toaster position="top-right" richColors closeButton duration={4000} />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex h-dvh flex-col bg-background overflow-hidden">
        <Header onMenuClick={() => setMenuOpen(true)} />

        <main ref={mainRef} className="flex-1 overflow-y-auto">
          {/* pb-20 on mobile so content clears the fixed bottom nav */}
          <div className="container mx-auto px-3 py-4 pb-20 sm:px-6 sm:py-6 xl:pb-6">
            <Outlet />
          </div>
        </main>

        <Footer />
      </div>

      {/* Fixed bottom tab navigation — mobile only */}
      <BottomNav />

      {/* Right-side community / social drawer */}
      <AppMenuDrawer open={menuOpen} onOpenChange={setMenuOpen} />

      {/* Global auth modal — login / register, controlled via useAuthModalStore */}
      <AuthModal />

      {/* In-flight withdrawal notifications — top-right floating cards */}
      <WithdrawalNotificationContainer />

      {/* Toast notifications */}
      <Toaster position="top-right" richColors closeButton duration={4000} />
    </TooltipProvider>
  );
}
