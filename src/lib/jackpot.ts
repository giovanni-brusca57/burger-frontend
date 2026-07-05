import { api } from './axios';
import { memoTTL } from './memoTTL';

/**
 * Shape returned by `GET /jackpot/status`. The BE returns one of two variants
 * inside the same envelope:
 *   - ineligible (no recruit in prev period) → only `eligible: false`,
 *     `message`, `currentPeriod`, `requiredRecruitmentPeriodLabel` are set.
 *   - eligible → `isSpun`/`isClaimed`/`rewardPct`/`rewardAmount` are set
 *     (the latter two only after the user has spun today).
 */
export interface JackpotStatus {
  eligible: boolean;
  /** Human-readable reason when ineligible. */
  message?: string;
  /** 1-indexed period (1..4). */
  currentPeriod: number;
  /** "Period N (start to end)" — shown to ineligible users to explain qual window. */
  requiredRecruitmentPeriodLabel?: string;
  /** True once today's spin has been executed. */
  isSpun?: boolean;
  /** True once today's reward has been claimed into PROFIT_NETWORK. */
  isClaimed?: boolean;
  /** Won percent as decimal (e.g. 0.005 = 0.5%). String when serialized from Prisma Decimal. */
  rewardPct?: string | number;
  /** Won USD amount. String when serialized from Prisma Decimal. */
  rewardAmount?: string | number;
}

export interface JackpotSpinResponse {
  message: string;
  /** Decimal percent rolled (e.g. 0.005, 0.01, 0.03). */
  rewardPct: number;
  /** Reward in USD calculated from user's TRADING balance × rewardPct. */
  rewardAmount: number;
}

export interface JackpotClaimResponse {
  message: string;
  /** Claimed USD amount as a decimal string (Prisma Decimal). */
  amount: string;
  /** True when the BE capped the credit to fit remaining bonus quota. */
  capped?: boolean;
}

/**
 * Detect the BE "bonus quota is fully filled" error messages so the FE can
 * surface a localized template instead of the raw English text. Matches both
 * the spin and the claim variants.
 */
export function isQuotaFullJackpotError(msg: unknown): boolean {
  return typeof msg === 'string' && /bonus quota is fully filled/i.test(msg);
}

// Hot path: PortfolioPage + LuckyBreakPage both fire this on mount, and the
// LuckyBreakPage refresh-after-spin cycle hits it again. Cache for 30s and
// invalidate after any mutation so post-mutation UI never sees stale data.
const cachedGetJackpotStatus = memoTTL(
  () => api.get<JackpotStatus>('/jackpot/status'),
  30_000,
);

export function getJackpotStatus(): Promise<JackpotStatus> {
  return cachedGetJackpotStatus();
}

/** Drop the /jackpot/status cache — auto-fired by spin/claim, exposed for ad-hoc force-refresh. */
export function invalidateJackpotStatus(): void {
  cachedGetJackpotStatus.invalidate();
}

export function spinJackpot(): Promise<JackpotSpinResponse> {
  return api.post<JackpotSpinResponse>('/jackpot/spin').then((r) => {
    cachedGetJackpotStatus.invalidate();
    return r;
  });
}

export function claimJackpot(): Promise<JackpotClaimResponse> {
  return api.post<JackpotClaimResponse>('/jackpot/claim').then((r) => {
    cachedGetJackpotStatus.invalidate();
    return r;
  });
}
