import { api } from './axios';
import { memoTTL } from './memoTTL';

/**
 * Per-batch state in the daily trading-profit distribution.
 * Three batches per day, rank-gated (UTC display, BE schedules in WIB internally):
 *  - batch 1 (02:00 UTC / 09:00 WIB) — all ranks
 *  - batch 2 (08:00 UTC / 15:00 WIB) — LEADER and above
 *  - batch 3 (14:00 UTC / 21:00 WIB) — GOLD_LEADER and above
 *
 * Payout model: user receives the full `grossAmount` into PROFIT_INVESTMENT.
 * Upline bonuses are paid on top (funded by platform margin), NOT deducted
 * from the user. So `profitInvestment === grossAmount` for new distributions.
 *
 * Fields are nullable when `distributed === false`.
 */
export interface TradingProfitBatch {
  batchNumber: 1 | 2 | 3;
  batchTime: string;        // BE returns "09:00 WIB" / "15:00 WIB" / "21:00 WIB"; UI shows UTC equivalents
  eligible: boolean;        // does the user's rank qualify for this batch?
  distributed: boolean;     // has admin distributed this batch today?
  rateRange: string | null;     // e.g. "0.60% – 1.00%"
  rateRangeMin: string | null;  // e.g. "0.60%"
  rateRangeMax: string | null;  // e.g. "1.00%"
  userRate: string | null;      // each user gets a uniform-random rate within [min, max]
  tradingBalance: string | null;
  grossAmount: string | null;       // balance × rate; what user actually receives
  profitInvestment: string | null;  // credited to PROFIT_INVESTMENT (= grossAmount post-2026-05)
  uplineTotal: string | null;       // bonus paid to uplines on top — NOT deducted from user
}

export interface TradingProfitToday {
  date: string;
  userRank: string;
  batchesEligible: number[];     // batch numbers the user qualifies for, e.g. [1, 2]
  batchesDistributed: number[];  // batch numbers admin has run today
  /** Sum of `profitInvestment` across all distributed batches. */
  profitInvestmentToday: string;
  /** Sum of network bonus credits today (downline activity). */
  profitNetworkToday: string;
  /** Always 3 entries — one per batch — even if not eligible/distributed. */
  batches: TradingProfitBatch[];
}

export function getTodayTradingProfit(): Promise<TradingProfitToday> {
  return api.get<TradingProfitToday>('/trading-profit/today');
}

/**
 * One row in the user's recent profit history. `profitRate` is the actual
 * per-batch random rate that landed within [min, max].
 *
 * Note: `userAmount === grossAmount` for distributions after 2026-05 — upline
 * bonuses are paid on top by the platform, not deducted from the user.
 */
export interface TradingProfitRecentEntry {
  batchNumber: 1 | 2 | 3;
  batchTime: string;        // BE returns WIB labels; UI shows UTC equivalents (02/08/14)
  date: string;             // YYYY-MM-DD (anchored to WIB on BE)
  profitRate: string;       // e.g. "0.85%"
  profitRateNumber: number; // numeric percent, e.g. 0.85
  userAmount: string;       // credited to user's PROFIT_INVESTMENT
  grossAmount: string;      // balance × rate (= userAmount post-2026-05)
  createdAt: string;        // ISO timestamp of when the credit ran
}

// DashboardPage fires this on mount with the default limit. Cache the
// default-limit response for 30s so quick re-mounts don't re-fetch.
// Non-default limits bypass the cache.
const cachedRecentDefault = memoTTL(
  () => api.get<TradingProfitRecentEntry[]>('/trading-profit/recent?limit=6'),
  30_000,
);

export function getRecentTradingProfit(limit = 6): Promise<TradingProfitRecentEntry[]> {
  if (limit === 6) return cachedRecentDefault();
  return api.get<TradingProfitRecentEntry[]>(`/trading-profit/recent?limit=${limit}`);
}

/** Drop the cached default-limit `/trading-profit/recent` response. */
export function invalidateRecentTradingProfit(): void {
  cachedRecentDefault.invalidate();
}
