import { create } from 'zustand';
import {
  getFeatureFlags,
  updateFeatureFlag as apiUpdate,
  DEFAULT_FLAGS,
  type FeatureFlag,
  type FeatureKey,
} from '@/lib/featureFlags';

interface FeatureFlagsStore {
  flags: FeatureFlag[];
  /** True until the first network response has resolved. */
  loading: boolean;
  fetched: boolean;
  fetchAll: () => Promise<void>;
  /** Look up a single flag — returns enabled=true if not found (fail-open). */
  isEnabled: (key: FeatureKey) => boolean;
  getFlag: (key: FeatureKey) => FeatureFlag | undefined;
  updateFlag: (
    key: FeatureKey,
    patch: { enabled?: boolean; message?: string },
  ) => Promise<void>;
}

export const useFeatureFlagsStore = create<FeatureFlagsStore>((set, get) => ({
  flags: DEFAULT_FLAGS,
  loading: false,
  fetched: false,

  async fetchAll() {
    set({ loading: true });
    try {
      const flags = await getFeatureFlags();
      set({ flags, loading: false, fetched: true });
    } catch {
      // getFeatureFlags() already swallows errors and returns DEFAULT_FLAGS,
      // so this branch is mostly for type-safety.
      set({ loading: false, fetched: true });
    }
  },

  isEnabled(key) {
    const flag = get().flags.find((f) => f.key === key);
    // Fail open — unknown keys are treated as enabled so a missing BE entry
    // can never lock users out of a feature.
    return flag?.enabled ?? true;
  },

  getFlag(key) {
    return get().flags.find((f) => f.key === key);
  },

  async updateFlag(key, patch) {
    const updated = await apiUpdate(key, patch);
    set((s) => ({
      flags: s.flags.map((f) => (f.key === key ? updated : f)),
    }));
  },
}));
