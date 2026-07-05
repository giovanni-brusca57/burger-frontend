import { api } from './axios';
import { memoTTL } from './memoTTL';

/**
 * Admin platform-wide totals shown at the top of the admin panel.
 * BE returns Decimal columns as strings — keep that shape on the FE so
 * `formatBalance()` can format without intermediate rounding.
 */
export interface AdminSummary {
  /** Lifetime sum of all confirmed deposits (USD). */
  totalDepositUsd: string;
  /** Lifetime sum of all completed withdrawals (USD). */
  totalWithdrawUsd: string;
  /** Sum of TRADING balance across all users right now (USD). */
  totalInvestmentUsd: string;
  /** Optional ISO timestamp the BE computed these numbers at. */
  updatedAt?: string;
}

// Cached for 30s — admin tab switches and remounts share the same response.
// `signal` is accepted for API compatibility but ignored when the cache hits;
// callers that mount AdminSummaryCards repeatedly avoid burning the BE budget.
const cachedGetAdminSummary = memoTTL(
  () => api.get<AdminSummary>('/admin/summary'),
  30_000,
);

export function getAdminSummary(signal?: AbortSignal): Promise<AdminSummary> {
  // If the caller wants strict abort semantics, bypass cache and pass signal.
  if (signal) return api.get<AdminSummary>('/admin/summary', { signal });
  return cachedGetAdminSummary();
}

/** Drop the /admin/summary cache — call after platform-affecting mutations. */
export function invalidateAdminSummary(): void {
  cachedGetAdminSummary.invalidate();
}
