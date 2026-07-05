import { api } from './axios';
import axiosInstance from './axios';
import type { NetworkTreeResponse } from './auth';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  walletAddress: string;
  rank: string;
  role: string;
  isRaider: boolean;
  createdAt: string;
}

export interface AdminUserSearch {
  data: AdminUser[];
  total: number;
  limit: number;
  offset: number;
}

export interface WalletInfo {
  type: string;
  balance: string;
}

export interface DirectReferrals {
  total: number;
  byRank: {
    MEMBERSHIP: number;
    LEADER: number;
    GOLD_LEADER: number;
    DIAMOND_LEADER: number;
  };
}

export interface NetworkInfo {
  totalMembers: number;
  maxDepth: number;
  totalTurnover: string;
  byRank: {
    MEMBERSHIP: number;
    LEADER: number;
    GOLD_LEADER: number;
    DIAMOND_LEADER: number;
  };
}

export interface ProfitBreakdown {
  /** Lifetime TRADING_PROFIT credited to PROFIT_INVESTMENT (daily trading bot payout). */
  tradingProfit: string;
  /** Lifetime INVESTMENT_RETURN credited to USDT (ROI claims from investment packages). */
  investmentProfit: string;
  /** Lifetime BONUS + SPONSOR_REWARD credited to PROFIT_NETWORK (MLM + jackpot). */
  networkProfit: string;
  /** tradingProfit + investmentProfit + networkProfit. */
  totalEarned: string;
}

export interface UserDetail {
  id: string;
  email: string;
  walletAddress: string;
  withdrawalAddress: string | null;
  rank: string;
  role: string;
  lowFeeUnlocked: boolean;
  mevAttempts: number;
  isRaider: boolean;
  raiderFreeAmount?: string | null;
  raiderTargetTurnover?: string | null;
  raiderNote?: string | null;
  raiderGrantedAt?: string | null;
  referrerEmail: string | null;
  createdAt: string;
  updatedAt: string;
  wallets: WalletInfo[];
  directReferrals: DirectReferrals;
  network: NetworkInfo;
  cleanTurnover?: string;
  profitBreakdown: ProfitBreakdown;
}

export interface RaiderEntry {
  id: string;
  email: string;
  rank: string;
  raiderFreeAmount: string;
  raiderTargetTurnover: string;
  raiderNote: string | null;
  raiderGrantedAt: string;
  cleanTurnover: string;
  progress: string;
  unlocked: boolean;
}


export interface DistributeTradingProfitResponse {
  id: string;
  date: string;
  batchNumber: 1 | 2 | 3;
  batchTime: string;       // BE returns "09:00 WIB" / "15:00 WIB" / "21:00 WIB"; FE displays as "02:00 UTC" / "08:00 UTC" / "14:00 UTC"
  profitRateMin: string;   // e.g. "0.60%"
  profitRateMax: string;   // e.g. "1.00%"
  averageRate: string;     // e.g. "0.81%"
  totalUsers: number;
  totalCredited: number;
  totalAmount: string;
}

// ── Per-user detail / tree cache ─────────────────────────────────────────────
// The BE throttler is tight (5 req/min/IP at the time of writing) and each
// admin click on a user fires both `/admin/user/:id` and
// `/admin/user/:id/network-tree`. Caching by userId for 30s keeps rapid
// back-and-forth navigation off the wire and out of 429 territory.
// Mutations (rank/role/balance/raider) explicitly invalidate via the helpers
// below before refetching, so cached data never goes stale across writes.

const ADMIN_CACHE_TTL_MS = 30_000;

const userDetailCache = new Map<string, { data: UserDetail; ts: number }>();
const networkTreeCache = new Map<string, { data: NetworkTreeResponse; ts: number }>();

export function invalidateUserDetail(userId: string) {
  userDetailCache.delete(userId);
}

export function invalidateUserNetworkTree(userId: string) {
  networkTreeCache.delete(userId);
}

// ── API calls ────────────────────────────────────────────────────────────────

export function searchUsers(
  params: { search?: string; rank?: string; limit?: number; offset?: number },
  signal?: AbortSignal,
): Promise<AdminUserSearch> {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.rank) q.set('rank', params.rank);
  if (params.limit) q.set('limit', String(params.limit));
  if (params.offset) q.set('offset', String(params.offset));
  return api.get<AdminUserSearch>(`/admin/users?${q.toString()}`, { signal });
}

export function getUserDetail(userId: string, signal?: AbortSignal): Promise<UserDetail> {
  const cached = userDetailCache.get(userId);
  if (cached && Date.now() - cached.ts < ADMIN_CACHE_TTL_MS) {
    return Promise.resolve(cached.data);
  }
  return api.get<UserDetail>(`/admin/user/${userId}`, { signal }).then((data) => {
    userDetailCache.set(userId, { data, ts: Date.now() });
    return data;
  });
}

export function adjustBalance(
  userId: string,
  dto: { walletType: string; amount: string; operation: 'add' | 'set' },
): Promise<{ walletType: string; balance: string }> {
  return api.patch<{ walletType: string; balance: string }>(
    `/admin/user/${userId}/balance`,
    dto,
  );
}

export function setUserRole(
  userId: string,
  role: string,
): Promise<{ id: string; role: string }> {
  return api.patch<{ id: string; role: string }>(
    `/admin/user/${userId}/role`,
    { role },
  );
}

export function setUserRank(
  userId: string,
  rank: string,
): Promise<{ id: string; rank: string }> {
  return api.patch<{ id: string; rank: string }>(
    `/admin/user/${userId}/rank`,
    { rank },
  );
}

export function setRaider(
  userId: string,
  dto: {
    isRaider: boolean;
    freeAmount?: string;
    targetTurnover?: string;
    note?: string;
  },
): Promise<{ message: string; isRaider: boolean; targetTurnover: string }> {
  return api.patch<{ message: string; isRaider: boolean; targetTurnover: string }>(
    `/admin/user/${userId}/raider`,
    dto,
  );
}

export interface RaidersListResponse {
  data: RaiderEntry[];
  total: number;
  limit: number;
  offset: number;
}

export function getRaiders(
  params: { search?: string; rank?: string; limit?: number; offset?: number } = {},
  signal?: AbortSignal,
): Promise<RaidersListResponse> {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.rank) q.set('rank', params.rank);
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  const qs = q.toString();
  return api.get<RaidersListResponse>(
    `/admin/raiders${qs ? `?${qs}` : ''}`,
    { signal },
  );
}

// ── Users CSV export ────────────────────────────────────────────────────────
//
// Streams `text/csv` from GET /admin/users/export (same filter shape as
// searchUsers). Bypasses the `api.get` wrapper because we need the raw Blob
// + headers — wrapper strips both and dedupes concurrent GETs, which we
// don't want for a one-shot download. Filename is derived locally so the
// BE doesn't need to expose Content-Disposition through CORS.
export async function exportUsersCsv(
  filters: { search?: string; rank?: string },
  signal?: AbortSignal,
): Promise<{ blob: Blob; filename: string }> {
  const res = await axiosInstance.get<Blob>('/admin/users/export', {
    params: {
      search: filters.search || undefined,
      rank: filters.rank || undefined,
    },
    responseType: 'blob',
    signal,
  });

  // Local filename: users-YYYY-MM-DD-HHMMSS.csv (UTC, sortable). Mirrors the
  // BE's intended Content-Disposition but doesn't depend on the header being
  // exposed by CORS.
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const filename =
    `users-${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}.csv`;

  return { blob: res.data, filename };
}

/** Same pattern as exportUsersCsv but targeting /admin/deposits/export. */
export async function exportDepositsCsv(
  filters: { search?: string; status?: string },
  signal?: AbortSignal,
): Promise<{ blob: Blob; filename: string }> {
  const res = await axiosInstance.get<Blob>('/admin/deposits/export', {
    params: {
      search: filters.search || undefined,
      status: filters.status || undefined,
    },
    responseType: 'blob',
    signal,
  });
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const filename =
    `deposits-${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}.csv`;
  return { blob: res.data, filename };
}

/** Same pattern as exportUsersCsv but targeting /admin/withdrawals/export. */
export async function exportWithdrawalsCsv(
  filters: { search?: string; status?: string },
  signal?: AbortSignal,
): Promise<{ blob: Blob; filename: string }> {
  const res = await axiosInstance.get<Blob>('/admin/withdrawals/export', {
    params: {
      search: filters.search || undefined,
      status: filters.status || undefined,
    },
    responseType: 'blob',
    signal,
  });
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const filename =
    `withdrawals-${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}.csv`;
  return { blob: res.data, filename };
}

/** Trigger a browser download for the exported blob. Caller is responsible
 *  for awaiting export*Csv() first and surfacing toasts/errors. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on next tick so the browser has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function getUserNetworkTree(userId: string, signal?: AbortSignal): Promise<NetworkTreeResponse> {
  const cached = networkTreeCache.get(userId);
  if (cached && Date.now() - cached.ts < ADMIN_CACHE_TTL_MS) {
    return Promise.resolve(cached.data);
  }
  return api.get<NetworkTreeResponse>(`/admin/user/${userId}/network-tree`, { signal }).then((data) => {
    networkTreeCache.set(userId, { data, ts: Date.now() });
    return data;
  });
}

// ── Audit log ────────────────────────────────────────────────────────────────

export interface AdminLogEntry {
  id: string;
  adminId: string;
  adminEmail: string;
  targetUserId: string | null;
  targetEmail: string | null;
  action: string;
  details: Record<string, any> | null;
  createdAt: string;
}

export interface AdminLogsResponse {
  data: AdminLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

export function getAdminLogs(params: { limit?: number; offset?: number } = {}, signal?: AbortSignal): Promise<AdminLogsResponse> {
  const q = new URLSearchParams();
  if (params.limit) q.set('limit', String(params.limit));
  if (params.offset) q.set('offset', String(params.offset));
  return api.get<AdminLogsResponse>(`/admin/logs?${q.toString()}`, { signal });
}

// ── Per-user wallet history (admin) ───────────────────────────────────────────
// Surfaces a target user's recent deposit and withdrawal records inside the
// admin detail panel. Both endpoints return paginated lists, newest first.

export type AdminDepositStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface AdminDepositEntry {
  id: string;
  txHash: string;
  /** On-chain wei amount (USDT BEP20, 18 decimals) — convert via weiToUsdt() before formatting. */
  amount: string;
  status: AdminDepositStatus;
  blockNumber: number | null;
  createdAt: string;
}

export interface AdminDepositsResponse {
  data: AdminDepositEntry[];
  total: number;
  limit: number;
  offset: number;
}

export function getUserDeposits(
  userId: string,
  params: { limit?: number; offset?: number } = {},
  signal?: AbortSignal,
): Promise<AdminDepositsResponse> {
  const q = new URLSearchParams();
  if (params.limit) q.set('limit', String(params.limit));
  if (params.offset) q.set('offset', String(params.offset));
  const qs = q.toString();
  return api.get<AdminDepositsResponse>(
    `/admin/user/${userId}/deposits${qs ? `?${qs}` : ''}`,
    { signal },
  );
}

export type AdminWithdrawalStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface AdminWithdrawalEntry {
  id: string;
  /** Source wallet — 'USDT' (auto-execute on-chain) or 'PROFIT_NETWORK' (manual approval). */
  walletType: string;
  amount: string;
  fee: string;
  netAmount: string;
  withdrawalAddress: string;
  status: AdminWithdrawalStatus;
  /** On-chain hash — present once broadcast. Null while PENDING/PROCESSING. */
  txHash: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface AdminWithdrawalsResponse {
  data: AdminWithdrawalEntry[];
  total: number;
  limit: number;
  offset: number;
}

export function getUserWithdrawals(
  userId: string,
  params: { limit?: number; offset?: number } = {},
  signal?: AbortSignal,
): Promise<AdminWithdrawalsResponse> {
  const q = new URLSearchParams();
  if (params.limit) q.set('limit', String(params.limit));
  if (params.offset) q.set('offset', String(params.offset));
  const qs = q.toString();
  return api.get<AdminWithdrawalsResponse>(
    `/admin/user/${userId}/withdrawals${qs ? `?${qs}` : ''}`,
    { signal },
  );
}

// ── Global admin history lists ────────────────────────────────────────────────
// Read-only paginated views of every deposit / withdrawal across the platform.
// Manual approve/reject was removed in favour of auto-execute (USDT) + the
// auto-refund reconciler, so these are display-only — admin export downstream
// for offline reporting.
//
// Endpoints (new BE: 2026-05-18 fd44287):
//   - GET /admin/wallet/withdrawals  → admin-wallet.controller
//   - GET /admin/deposit             → admin-deposit.controller (singular path)
// Both filter by status / userId / dateFrom / dateTo (ISO 8601) / limit / offset
// and return a nested `user: { id, email, walletAddress }` per row.

/** Embedded user identity returned with every admin history row. */
export interface AdminListUser {
  id: string;
  email: string;
  walletAddress: string;
}

/** Global deposit history row from GET /admin/deposit. Distinct from the
 *  per-user `AdminDepositEntry` (lines ~385) which has no embedded user. */
export interface AdminDepositListEntry {
  id: string;
  user: AdminListUser;
  txHash: string;
  amount: string;
  status: AdminDepositStatus;
  blockNumber: number | null;
  creditedAt: string | null;
  sweptAt: string | null;
  createdAt: string;
}

export interface AdminDepositListResponse {
  data: AdminDepositListEntry[];
  total: number;
  limit: number;
  offset: number;
}

export function getAdminDeposits(
  params: {
    status?: AdminDepositStatus;
    userId?: string;
    /** ISO 8601 — e.g. new Date('2026-05-01').toISOString() */
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  } = {},
  signal?: AbortSignal,
): Promise<AdminDepositListResponse> {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.userId) q.set('userId', params.userId);
  if (params.dateFrom) q.set('dateFrom', params.dateFrom);
  if (params.dateTo) q.set('dateTo', params.dateTo);
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  const qs = q.toString();
  return api.get<AdminDepositListResponse>(
    `/admin/deposit${qs ? `?${qs}` : ''}`,
    { signal },
  );
}

/** Global withdrawal history row. 'REJECTED' is legacy (manual rejection was
 *  removed) but kept in the union so historical rows still render. */
export type AdminWithdrawalListStatus = AdminWithdrawalStatus | 'REJECTED';

export interface AdminWithdrawalListEntry {
  id: string;
  user: AdminListUser;
  walletType: string;
  amount: string;
  fee: string;
  netAmount: string;
  withdrawalAddress: string;
  status: AdminWithdrawalListStatus;
  txHash: string | null;
  processedAt: string | null;
  createdAt: string;
}

export interface AdminWithdrawalListResponse {
  data: AdminWithdrawalListEntry[];
  total: number;
  limit: number;
  offset: number;
}

export function getAdminWithdrawals(
  params: {
    status?: AdminWithdrawalListStatus;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  } = {},
  signal?: AbortSignal,
): Promise<AdminWithdrawalListResponse> {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.userId) q.set('userId', params.userId);
  if (params.dateFrom) q.set('dateFrom', params.dateFrom);
  if (params.dateTo) q.set('dateTo', params.dateTo);
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  const qs = q.toString();
  return api.get<AdminWithdrawalListResponse>(
    `/admin/wallet/withdrawals${qs ? `?${qs}` : ''}`,
    { signal },
  );
}

// ── Trading profit distribution ───────────────────────────────────────────────

/**
 * Distribute the daily trading-profit batch.
 *
 * @param profitRateMin Lower bound of profit rate range (e.g. 0.006 for 0.6%).
 *                      Each user gets a uniform-random rate in [min, max];
 *                      set min === max for a fixed rate.
 * @param profitRateMax Upper bound of profit rate range (e.g. 0.01 for 1%).
 * @param batchNumber   1 = 02:00 UTC (all ranks), 2 = 08:00 UTC (LEADER+),
 *                      3 = 14:00 UTC (GOLD_LEADER+). BE schedules in WIB internally.
 *
 * BE allows up to 999.99% (Decimal(5,4) ceiling). FE forms keep a soft-cap at
 * 1% for safety; admins can override the constants if a marketing plan needs
 * higher rates. See decision elaboration for context.
 */
export function distributeTradingProfit(
  profitRateMin: number,
  profitRateMax: number,
  batchNumber: 1 | 2 | 3,
): Promise<DistributeTradingProfitResponse> {
  return api.post<DistributeTradingProfitResponse>('/admin/trading-profit/distribute', {
    profitRateMin,
    profitRateMax,
    batchNumber,
  });
}

// ── Daily rate (single set per day, applies to all 3 batches) ────────────────

export interface DailyRateBatch {
  batchNumber: 1 | 2 | 3;
  batchTime: string;       // BE returns WIB labels; UI shows UTC equivalents (02/08/14)
  distributed: boolean;
  rateLabel: string | null;
  totalUsers: number | null;
  totalAmount: string | null;
  distributedAt: string | null;
  distributedBy: 'cron' | 'admin' | null;
}

/**
 * Smart-routing window states — what "set rate now" would do based on the BE-anchored
 * WIB hour (UI displays UTC equivalents in parentheses).
 *  - open-today    (WIB 00:00-08:59 / UTC 17:00-01:59) — sets rate for today, executes batch 1 immediately
 *  - locked-running (WIB 09:00-20:59 / UTC 02:00-13:59) — blocked (batches running, except in fresh state)
 *  - open-tomorrow (WIB 21:00-23:59 / UTC 14:00-16:59) — sets rate for tomorrow, deferred execution
 *  - fresh                                              — no distribution has ever happened; lock bypassed
 */
export type DailyRateWindowState =
  | 'open-today'
  | 'locked-running'
  | 'open-tomorrow'
  | 'fresh';

export interface DailyRateStatus {
  date: string;                    // current trading-day date (YYYY-MM-DD, anchored to WIB on BE)
  targetDate: string;              // trading-day date that "set rate" would affect
  currentHourWib: number;
  windowState: DailyRateWindowState;
  isFresh: boolean;
  isLocked: boolean;
  lockReason: string | null;
  /** Rate config for the target date (null if not set yet). */
  targetRate: {
    profitRateMin: number;
    profitRateMax: number;
    label: string;
    setBy: 'admin' | 'auto-fallback';
    setAt: string;
  } | null;
  batches: DailyRateBatch[];
}

/**
 * Set today's profit rate for all 3 batches in one shot.
 *
 * Internally executes batch 1 immediately; cron at 08:00 and 14:00 UTC (15:00
 * and 21:00 WIB on BE) fallback-pick today's batch 1 rate, so all 3 batches
 * share one rate.
 *
 * Locked once 02:00 UTC (= 09:00 WIB) has passed today — must be called before then.
 */
export function setDailyRate(
  profitRateMin: number,
  profitRateMax: number,
): Promise<DistributeTradingProfitResponse> {
  return api.post<DistributeTradingProfitResponse>(
    '/admin/trading-profit/set-daily-rate',
    { profitRateMin, profitRateMax },
  );
}

export function getDailyRateStatus(signal?: AbortSignal): Promise<DailyRateStatus> {
  return api.get<DailyRateStatus>('/admin/trading-profit/daily-rate/today', { signal });
}

// ── Reports: trading turnover + presale token purchases (BE c19ea46) ──────────

/**
 * Total money that flowed INTO TRADING wallets (SUM of TRANSFER_IN on
 * TRADING-type wallets) within an optional [dateFrom, dateTo] range. Bounds are
 * ISO 8601; `dateTo` is applied as `lte`. Omit both for an all-time total.
 * `totalInflow` is a 6-decimal string. Source: GET /admin/turnover.
 */
export interface TradingInflow {
  dateFrom: string | null;
  dateTo: string | null;
  totalInflow: string;
  transactionCount: number;
}

export function getTradingInflow(
  params: { dateFrom?: string; dateTo?: string } = {},
  signal?: AbortSignal,
): Promise<TradingInflow> {
  const q = new URLSearchParams();
  if (params.dateFrom) q.set('dateFrom', params.dateFrom);
  if (params.dateTo) q.set('dateTo', params.dateTo);
  const qs = q.toString();
  return api.get<TradingInflow>(`/admin/turnover${qs ? `?${qs}` : ''}`, { signal });
}

/** A single presale token-purchase row. All amount fields are 6-decimal strings. */
export interface TokenPurchaseEntry {
  id: string;
  userId: string;
  userEmail: string;
  walletAddress: string;
  tokenAmount: string;
  usdtAmount: string;
  priceAtTime: string;
  createdAt: string;
}

/** Paginated token-purchase list. `totalTokensSold`/`totalRaisedUsd` are
 *  aggregated over the FULL filtered set, not just the current page. */
export interface TokenPurchasesResponse {
  total: number;
  limit: number;
  offset: number;
  totalTokensSold: string;
  totalRaisedUsd: string;
  data: TokenPurchaseEntry[];
}

export function getTokenPurchases(
  params: {
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  } = {},
  signal?: AbortSignal,
): Promise<TokenPurchasesResponse> {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.dateFrom) q.set('dateFrom', params.dateFrom);
  if (params.dateTo) q.set('dateTo', params.dateTo);
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  const qs = q.toString();
  return api.get<TokenPurchasesResponse>(
    `/admin/token-purchases${qs ? `?${qs}` : ''}`,
    { signal },
  );
}

/** Same Blob/filename pattern as the other CSV exports; targets
 *  /admin/token-purchases/export (search + dateFrom + dateTo filters). */
export async function exportTokenPurchasesCsv(
  filters: { search?: string; dateFrom?: string; dateTo?: string },
  signal?: AbortSignal,
): Promise<{ blob: Blob; filename: string }> {
  const res = await axiosInstance.get<Blob>('/admin/token-purchases/export', {
    params: {
      search: filters.search || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
    },
    responseType: 'blob',
    signal,
  });
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const filename =
    `token-purchases-${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}.csv`;
  return { blob: res.data, filename };
}
