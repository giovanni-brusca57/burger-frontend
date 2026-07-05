import { api } from './axios';

/**
 * Closed list of features that admins can toggle off for maintenance.
 *
 * Page-level keys gate the corresponding route (FeatureGate wraps the lazy
 * page). Action-level keys gate specific operations inside MyWalletPage
 * (deposit / withdraw / internal transfer buttons).
 *
 * Adding a new key here requires (a) a matching entry in DEFAULT_FLAGS, and
 * (b) wiring it into a route or action handler.
 */
export type FeatureKey =
  // Page routes
  | 'dashboard'
  | 'my_wallet'
  | 'profile'
  | 'portfolio'
  | 'lucky_break'
  | 'presale'
  // Action gates within /my-wallet
  | 'deposits'
  | 'withdrawals'
  | 'internal_transfers';

export const FEATURE_KEYS: FeatureKey[] = [
  'dashboard',
  'my_wallet',
  'profile',
  'portfolio',
  'lucky_break',
  'presale',
  'deposits',
  'withdrawals',
  'internal_transfers',
];

export interface FeatureFlag {
  key: FeatureKey;
  enabled: boolean;
  /** Optional admin-supplied note shown to users on the maintenance screen. */
  message: string | null;
  /** ISO timestamp — always present (BE synthesizes `now` for default rows). */
  updatedAt: string;
  /** Admin userId of the last toggler — null for synthesized defaults. */
  updatedBy: string | null;
}

interface FeatureFlagsResponse {
  flags: FeatureFlag[];
}

/**
 * Fail-open defaults — used until BE returns its first response (and as a
 * permanent fallback if the BE endpoint isn't deployed yet). Everything ON
 * means the page never breaks if /feature-flags is missing.
 */
export const DEFAULT_FLAGS: FeatureFlag[] = FEATURE_KEYS.map((key) => ({
  key,
  enabled: true,
  message: null,
  updatedAt: new Date(0).toISOString(),
  updatedBy: null,
}));

/** All-users endpoint — every authenticated user fetches to know what's locked. */
export async function getFeatureFlags(signal?: AbortSignal): Promise<FeatureFlag[]> {
  try {
    const res = await api.get<FeatureFlagsResponse>('/feature-flags', { signal });
    return res.flags;
  } catch {
    // BE not yet deployed — fail open so the app still works.
    return DEFAULT_FLAGS;
  }
}

/** Admin-only mutation. */
export function updateFeatureFlag(
  key: FeatureKey,
  patch: { enabled?: boolean; message?: string },
): Promise<FeatureFlag> {
  return api.patch<FeatureFlag>(`/admin/feature-flags/${key}`, patch);
}
