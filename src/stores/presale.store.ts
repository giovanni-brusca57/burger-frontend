import { create } from 'zustand';
import { getPresaleStats, type PresaleStats } from '@/lib/presale';

const STALE_MS = 30_000;

interface PresaleStoreState {
  stats: PresaleStats | null;
  loading: boolean;
  lastFetched: number | null;
  fetchStats: () => Promise<void>;
  invalidate: () => void;
  /** Full wipe on logout / user switch. */
  reset: () => void;
}

export const usePresaleStore = create<PresaleStoreState>((set, get) => ({
  stats: null,
  loading: false,
  lastFetched: null,

  fetchStats: async () => {
    const { loading, lastFetched } = get();
    const now = Date.now();
    if (loading || (lastFetched !== null && now - lastFetched < STALE_MS)) return;

    set({ loading: true });
    try {
      const data = await getPresaleStats();
      set({ stats: data, lastFetched: Date.now() });
    } catch {
      // silent
    } finally {
      set({ loading: false });
    }
  },

  invalidate: () => set({ lastFetched: null }),

  reset: () => set({ stats: null, loading: false, lastFetched: null }),
}));

// Dev preview hook — exposes the store on window so preview-seed can populate
// mock stats without a backend. Stripped from prod builds.
if (import.meta.env.DEV) {
  (window as unknown as { __presaleStore?: typeof usePresaleStore }).__presaleStore = usePresaleStore;
}
