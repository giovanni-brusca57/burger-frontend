import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getProfile } from '@/lib/auth';
import { invalidateAllCaches } from '@/lib/memoTTL';
import type { UserProfile } from '@/types/auth.types';

const STALE_MS = 30_000;
const REFRESH_COOLDOWN_MS = 5_000;
const PROFILE_SESSION_KEY = 'burger-profile-cache';

// ── sessionStorage helpers ────────────────────────────────────────────────────
// Profile is not persisted to localStorage (security: avoids stale role data).
// We use sessionStorage as a short-lived cache that survives page refreshes
// within the same browser tab but is cleared when the tab closes.

function readSessionCache(): { data: UserProfile; ts: number } | null {
  try {
    const raw = sessionStorage.getItem(PROFILE_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSessionCache(data: UserProfile) {
  try {
    sessionStorage.setItem(PROFILE_SESSION_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // quota exceeded — ignore
  }
}

function clearSessionCache() {
  sessionStorage.removeItem(PROFILE_SESSION_KEY);
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  userId: string;
  email: string;
  walletAddress: string;
  rank: string;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;

  // Authoritative role source — re-fetched from GET /auth/profile, never persisted
  profile: UserProfile | null;
  profileLastFetched: number | null;

  setAuth: (data: {
    accessToken: string;
    userId: string;
    email: string;
    walletAddress: string;
    rank: string;
  }) => void;
  updateUser: (data: Partial<AuthUser>) => void;
  /** Fetch profile if stale (30s in-memory cache, 30s sessionStorage cache) */
  fetchProfile: () => Promise<void>;
  /** Force re-fetch profile — respects a 5s cooldown to prevent 429 on rapid refreshes */
  refreshProfile: () => Promise<void>;
  logout: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      profile: null,
      profileLastFetched: null,

      setAuth: ({ accessToken, userId, email, walletAddress, rank }) => {
        localStorage.setItem('access_token', accessToken);
        clearSessionCache();
        set({
          accessToken,
          user: { userId, email, walletAddress, rank },
          isAuthenticated: true,
          profile: null,
          profileLastFetched: null,
        });
      },

      updateUser: (data) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        }));
      },

      fetchProfile: async () => {
        const { profileLastFetched, isAuthenticated } = get();
        if (!isAuthenticated) return;

        const now = Date.now();

        // 1. In-memory cache (survives re-renders, not page refresh)
        if (profileLastFetched !== null && now - profileLastFetched < STALE_MS) return;

        // 2. sessionStorage cache (survives page refresh within same tab)
        const cached = readSessionCache();
        if (cached && now - cached.ts < STALE_MS) {
          set({ profile: cached.data, profileLastFetched: cached.ts });
          return;
        }

        try {
          const data = await getProfile();
          writeSessionCache(data);
          set({ profile: data, profileLastFetched: Date.now() });
        } catch {
          // silent — callers fall back to cached profile
        }
      },

      refreshProfile: async () => {
        if (!get().isAuthenticated) return;

        const now = Date.now();

        // Short cooldown: if the profile was fetched within the last 5s
        // (e.g. rapid page refreshes), reuse the sessionStorage cache instead
        // of hammering the API and getting a 429.
        const cached = readSessionCache();
        if (cached && now - cached.ts < REFRESH_COOLDOWN_MS) {
          set({ profile: cached.data, profileLastFetched: cached.ts });
          return;
        }

        // Outside cooldown — fetch fresh and throw on failure so callers
        // (AdminGuard, AdminLoginPage) can handle auth errors explicitly.
        const data = await getProfile();
        writeSessionCache(data);
        set({ profile: data, profileLastFetched: Date.now() });
      },

      logout: () => {
        localStorage.removeItem('access_token');
        clearSessionCache();
        // Wipe every memoTTL cache so the next user (or re-login as same user)
        // never sees the previous session's data leaking through. Covers
        // jackpot status, mev wallet, admin summary, global pool, recent
        // trading profit — anything wrapped via memoTTL.
        invalidateAllCaches();
        // Hard-reset zustand stores that hold user-bound data (wallets,
        // profit summary, paginated transactions, presale stats). Dynamic
        // imports keep this module free of circular dependencies on stores
        // that themselves consume axios → auth handling.
        import('./wallet.store').then(({ useWalletStore }) => {
          useWalletStore.getState().reset();
        });
        import('./presale.store').then(({ usePresaleStore }) => {
          usePresaleStore.getState().reset();
        });
        set({
          accessToken: null,
          user: null,
          isAuthenticated: false,
          profile: null,
          profileLastFetched: null,
        });
      },
    }),
    {
      name: 'mac-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ── Dev preview hook ───────────────────────────────────────────────────────
// Expose store on window in DEV so the preview-seed module can inject a
// profile. Tree-shaken from prod builds via Vite's import.meta.env.DEV.
if (import.meta.env.DEV) {
  (window as unknown as { __authStore?: typeof useAuthStore }).__authStore = useAuthStore;
}
