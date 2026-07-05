import { api } from './axios';
import { memoTTL } from './memoTTL';

export type DepositStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface Deposit {
  id: string;
  txHash: string;
  /** Wei amount as string, e.g. "30000000000000000000" */
  amount: string;
  status: DepositStatus;
  blockNumber: number | null;
  createdAt: string;
  /**
   * Present only on the submit response. `true` when the tx hash was already
   * recorded (by the auto-scanner or an earlier submit) and the backend returned
   * the existing deposit's current status instead of creating a new one — used to
   * show an "already recorded" note rather than implying a fresh credit.
   */
  alreadyRecorded?: boolean;
}

/** Convert wei string to USDT number (÷ 10^18) */
export function weiToUsdt(wei: string): number {
  return Number(BigInt(wei)) / 1e18;
}

export function getDepositHistory(): Promise<Deposit[]> {
  return api.get<Deposit[]>('/deposit/history');
}

export function submitDeposit(txHash: string): Promise<Deposit> {
  return api.post<Deposit>('/deposit/submit', { txHash });
}

// ── Investments ───────────────────────────────────────────────────────────────

export type InvestmentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Investment {
  id: string;
  amount: string;
  returns: string;
  status: InvestmentStatus;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
}

export interface ClaimRoiResponse {
  investmentId: string;
  claimedAmount: string;
  creditedTo: string;
  message: string;
}

export function getInvestments(): Promise<Investment[]> {
  return api.get<Investment[]>('/deposit/investments');
}

export function claimRoi(investmentId: string): Promise<ClaimRoiResponse> {
  return api.post<ClaimRoiResponse>(`/deposit/investments/${investmentId}/claim-roi`);
}

// ── Global pool (public) ──────────────────────────────────────────────────────

export interface GlobalPoolStat {
  totalInvested: string;
  totalInvestors: number;
  averageInvestment: string;
  lastUpdated: string;
}

// DashboardPage fires this on mount; the global-pool stat updates slowly.
// 60s cache means quick page revisits skip the network round-trip entirely.
const cachedGetGlobalPool = memoTTL(
  () => api.get<GlobalPoolStat>('/deposit/global-pool'),
  60_000,
);

export function getGlobalPool(signal?: AbortSignal): Promise<GlobalPoolStat> {
  if (signal) return api.get<GlobalPoolStat>('/deposit/global-pool', { signal });
  return cachedGetGlobalPool();
}

/** Drop the /deposit/global-pool cache — rarely needed, but exposed for completeness. */
export function invalidateGlobalPool(): void {
  cachedGetGlobalPool.invalidate();
}
