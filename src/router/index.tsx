import { lazy, Suspense, useEffect, useState } from 'react';
import { createBrowserRouter, Navigate, Outlet, useRouteError, useSearchParams } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { FeatureGate } from '@/components/FeatureGate';
import { useAuthStore } from '@/stores/auth.store';
import { useAuthModalStore } from '@/stores/auth-modal.store';

// Top-level wrapper that handles `?ref=` regardless of auth state. Sits above
// `AppLayout` so that even when AppLayout early-returns the unauth branch
// (no <Outlet/>), this effect still re-runs on auth flips (e.g. after a 401
// logout) and surfaces the prefilled register modal instead of leaving a
// stranded login modal with `?ref=` ignored on the URL.
function RefHandler() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const showRegister = useAuthModalStore((s) => s.showRegister);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref && !isAuthenticated) {
      showRegister(ref);
      setSearchParams(
        (p) => { const n = new URLSearchParams(p); n.delete('ref'); return n; },
        { replace: true }
      );
    }
  }, [searchParams, isAuthenticated, showRegister, setSearchParams]);

  return <Outlet />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const showLogin = useAuthModalStore((s) => s.showLogin);

  if (!isAuthenticated) {
    showLogin();
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Wraps lazy() and auto-reloads once when the chunk can't be fetched (stale deploy)
function lazyWithReload<T extends React.ComponentType>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(() =>
    factory().catch((err) => {
      const reloadKey = `chunk-reload:${factory.toString().slice(0, 60)}`;
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
        // Return a never-resolving promise — reload is in progress
        return new Promise<never>(() => {});
      }
      throw err;
    })
  );
}

function ChunkErrorBoundary() {
  const error = useRouteError() as Error | undefined;
  const msg = error?.message ?? '';
  // Chunk-load failures vary by browser/webview. Match broadly so a post-deploy
  // stale tab always gets the "reload" path instead of a hard crash screen.
  const isChunkError =
    /dynamically imported module|Importing a module script failed|module script failed|error loading dynamically|ChunkLoadError|Failed to fetch/i.test(
      msg,
    ) || (error as { name?: string })?.name === 'ChunkLoadError';

  if (isChunkError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">New version available.</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* Reload is the correct fix for a stale chunk (fetches the new bundle). */}
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
          {/* Escape hatch if reload doesn't help — hard-navigate to a safe route. */}
          <button
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent"
            onClick={() => { window.location.href = '/dashboard'; }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Any other render/runtime error: show a friendly fallback instead of
  // re-throwing into React Router's raw default screen. Without this, a single
  // unguarded access (e.g. in the persistent withdrawal-notification card) takes
  // the whole app down to the "Hey developer 👋" page. Details shown in dev only.
  return (
    <div className="flex min-h-[16rem] flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm font-semibold text-foreground">Something went wrong.</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        An unexpected error occurred. Go back to your dashboard, or reload if the problem persists.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {/* Primary escape: hard-navigate to a known-good route. This both leaves
            the broken URL (so a deterministic page error doesn't just re-crash
            on reload) and fully resets in-memory state. */}
        <button
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          onClick={() => { window.location.href = '/dashboard'; }}
        >
          Go to Dashboard
        </button>
        {/* Secondary: reload the same URL — recovers chunk/transient errors. */}
        <button
          className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
      {import.meta.env.DEV && error && (
        <pre className="mt-2 max-w-full overflow-auto rounded-md bg-muted/40 p-3 text-left text-[10px] text-muted-foreground">
          {error.stack ?? error.message}
        </pre>
      )}
    </div>
  );
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const profileRole = useAuthStore((s) => s.profile?.role);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    // Profile is not persisted — on refresh it's null. Re-fetch it.
    if (isAuthenticated && profileRole === undefined) {
      setLoading(true);
      refreshProfile()
        .then(() => {
          const role = useAuthStore.getState().profile?.role;
          if (role !== 'ADMIN') setDenied(true);
        })
        .catch(() => setDenied(true))
        .finally(() => setLoading(false));
    }
  }, [isAuthenticated, profileRole, refreshProfile]);

  if (!isAuthenticated) return <Navigate to="/admin-login" replace />;

  // Profile not yet fetched — show spinner while re-fetching after refresh
  if (loading || (profileRole === undefined && !denied)) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <span className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (denied || profileRole !== 'ADMIN') return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

const DashboardPage = lazyWithReload(() => import('@/pages/DashboardPage'));
const MyWalletPage = lazyWithReload(() => import('@/pages/MyWalletPage'));
const ProfilePage = lazyWithReload(() => import('@/pages/ProfilePage'));
const PortfolioPage = lazyWithReload(() => import('@/pages/PortfolioPage'));
const LuckyBreakPage = lazyWithReload(() => import('@/pages/LuckyBreakPage'));
const PresalePage = lazyWithReload(() => import('@/pages/PresalePage'));
const AdminPage = lazyWithReload(() => import('@/pages/AdminPage'));
const AdminLoginPage = lazyWithReload(() => import('@/pages/AdminLoginPage'));
const NotFoundPage = lazyWithReload(() => import('@/pages/NotFoundPage'));

// Index `/` redirects to /dashboard. `?ref=` (if any) is consumed upstream by
// RefHandler before this runs, so no need to forward it.
function RefRedirect() {
  return <Navigate to="/dashboard" replace />;
}

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <span className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <RefHandler />,
    // Final safety net: errors that escape a child route's boundary (or originate
    // in RefHandler/the root) land here instead of React Router's raw screen.
    errorElement: <ChunkErrorBoundary />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        errorElement: <ChunkErrorBoundary />,
        children: [
          {
            index: true,
            element: <RefRedirect />,
          },
          {
            path: 'dashboard',
            element: <FeatureGate flag="dashboard"><Suspense fallback={<PageLoader />}><DashboardPage /></Suspense></FeatureGate>,
            errorElement: <ChunkErrorBoundary />,
          },
          {
            path: 'my-wallet',
            element: <ProtectedRoute><FeatureGate flag="my_wallet"><Suspense fallback={<PageLoader />}><MyWalletPage /></Suspense></FeatureGate></ProtectedRoute>,
            errorElement: <ChunkErrorBoundary />,
          },
          {
            path: 'profile',
            element: <ProtectedRoute><FeatureGate flag="profile"><Suspense fallback={<PageLoader />}><ProfilePage /></Suspense></FeatureGate></ProtectedRoute>,
            errorElement: <ChunkErrorBoundary />,
          },
          {
            path: 'portfolio',
            element: <ProtectedRoute><FeatureGate flag="portfolio"><Suspense fallback={<PageLoader />}><PortfolioPage /></Suspense></FeatureGate></ProtectedRoute>,
            errorElement: <ChunkErrorBoundary />,
          },
          {
            path: 'lucky-break',
            element: <ProtectedRoute><FeatureGate flag="lucky_break"><Suspense fallback={<PageLoader />}><LuckyBreakPage /></Suspense></FeatureGate></ProtectedRoute>,
            errorElement: <ChunkErrorBoundary />,
          },
          {
            path: 'presale',
            element: <ProtectedRoute><FeatureGate flag="presale"><Suspense fallback={<PageLoader />}><PresalePage /></Suspense></FeatureGate></ProtectedRoute>,
            errorElement: <ChunkErrorBoundary />,
          },
        ],
      },
      // Admin login page — standalone (no layout)
      {
        path: '/admin-login',
        element: <Suspense fallback={<PageLoader />}><AdminLoginPage /></Suspense>,
        errorElement: <ChunkErrorBoundary />,
      },
      // Admin control panel — uses AdminLayout (no user nav, no wallet UI)
      {
        path: '/control-panel',
        element: <AdminGuard><AdminLayout /></AdminGuard>,
        errorElement: <ChunkErrorBoundary />,
        children: [
          {
            index: true,
            element: <Suspense fallback={<PageLoader />}><AdminPage /></Suspense>,
            errorElement: <ChunkErrorBoundary />,
          },
        ],
      },
      {
        path: '*',
        element: <Suspense fallback={<PageLoader />}><NotFoundPage /></Suspense>,
        errorElement: <ChunkErrorBoundary />,
      },
    ],
  },
]);
