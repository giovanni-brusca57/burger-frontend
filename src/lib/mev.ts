import { api } from './axios';
import { memoTTL } from './memoTTL';

// ── Response shapes ────────────────────────────────────────────────────────

export interface MevWallet {
  address: string;
  mevAttempts: number;
}

export interface MevExportKeyResponse {
  address: string;
  privateKey: string;
}

export interface MevAdminUser {
  id: string;
  email: string;
  walletAddress: string;
  rank: string;
  mevAttempts: number;
}

export interface MevConfig {
  grantIntervalDays: number;
  lastGrantedAt: string | null;
}

// ── User endpoints ─────────────────────────────────────────────────────────

// PortfolioPage fires this on mount; result rarely changes (only when an
// admin grants attempts). 30s cache prevents repeat-mounts from re-fetching.
const cachedGetMevWallet = memoTTL(
  () => api.get<MevWallet>('/mev/wallet'),
  30_000,
);

/** GET /mev/wallet — returns Burger wallet if user is qualified; 403 if not */
export function getMevWallet(): Promise<MevWallet> {
  return cachedGetMevWallet();
}

/** Drop the /mev/wallet cache — call after mutations that change mevAttempts. */
export function invalidateMevWallet(): void {
  cachedGetMevWallet.invalidate();
}

/** POST /mev/wallet/export-key — requires account password; rate-limited 3/min */
export function exportMevPrivateKey(password: string): Promise<MevExportKeyResponse> {
  return api.post<MevExportKeyResponse>('/mev/wallet/export-key', { password });
}

// ── Admin endpoints ────────────────────────────────────────────────────────

export interface MevAdminUsersResponse {
  data: MevAdminUser[];
  total: number;
  limit: number;
  offset: number;
}

/** GET /mev/admin/users — list all users with their mevAttempts (admin only) */
export function getMevAdminUsers(params?: {
  search?: string;
  rank?: string;
  limit?: number;
  offset?: number;
}, signal?: AbortSignal): Promise<MevAdminUsersResponse> {
  return api.get<MevAdminUsersResponse>('/mev/admin/users', { params, signal });
}

/** PATCH /mev/admin/attempts — grant attempts to a user (admin only) */
export function addMevAttempts(payload: {
  userId: string;
  attempts: number;
}): Promise<{ id: string; email: string; mevAttempts: number }> {
  return api.patch('/mev/admin/attempts', payload);
}

/** PATCH /mev/admin/config — update auto-grant interval (admin only) */
export function setMevConfig(payload: {
  grantIntervalDays: number;
}): Promise<MevConfig> {
  return api.patch('/mev/admin/config', payload);
}

/** GET /mev/admin/config — get current config (admin only) */
export function getMevConfig(signal?: AbortSignal): Promise<MevConfig> {
  return api.get<MevConfig>('/mev/admin/config', { signal });
}
