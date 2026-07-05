import { api } from './axios';
import type { WalletApiType } from '@/components/wallet/wallet.types';

/**
 * Format a decimal amount string from the BE (e.g. "30.0000" → "30", "0.5000" → "0.5").
 * Uses parseFloat to strip trailing zeros naturally.
 */
export function fmtAmount(value: string | number): string {
  const n = parseFloat(String(value));
  if (isNaN(n)) return String(value);
  return n.toLocaleString('en-US', { maximumFractionDigits: 6, useGrouping: false });
}

// ── Transaction type from BE enum ──────────────────────────────────────────

export type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'INVESTMENT'
  | 'INVESTMENT_RETURN'
  | 'SPONSOR_REWARD'
  | 'BONUS'
  | 'COMPOUND'
  | 'TRADING_PROFIT'
  | 'SWEEP'
  | 'TOKEN_PURCHASE';

// ── Response shapes ────────────────────────────────────────────────────────

export interface WalletInfo {
  type: WalletApiType;
  balance: string;
}

export interface GetWalletsResponse {
  depositAddress: string;
  depositNetworks: string[];
  wallets: WalletInfo[];
}

export interface WalletTransaction {
  id: string;
  walletType: WalletApiType;
  type: TransactionType;
  amount: string;
  balanceAfter: string;
  /**
   * Opaque BE reference. Same column, different meaning per (walletType, type):
   *   - DEPOSIT (USDT)              → on-chain txHash (rendered as BscScan link)
   *   - WITHDRAWAL                  → withdrawal record id (txHash is on `withdrawal.txHash`)
   *   - BONUS / SPONSOR_REWARD      → distribution / source identifier (labeled as "Referrer Address" in PROFIT_NETWORK)
   *   - TRADING_PROFIT / others     → internal record id
   */
  reference: string | null;
  description: string | null;
  createdAt: string;
  /**
   * Embedded withdrawal record — present only when type === 'WITHDRAWAL'.
   * BE LEFT JOINs `withdrawals` via `tx.reference = withdrawal.id`.
   */
  withdrawal?: Omit<WithdrawalEntry, 'createdAt'>;
  /**
   * Embedded originating-downline info — present only when type === 'BONUS'.
   * BE matches the wallet_transaction row against `bonus_logs` by createdAt
   * (±2s) and amount, then joins the source user. Use `from.email` as the
   * human-readable "From Address" value on PROFIT_NETWORK BONUS rows.
   */
  from?: {
    userId: string;
    email: string;
    walletAddress: string;
    level: number;
    percentage: number;
  } | null;
}

export interface GetTransactionsResponse {
  total: number;
  limit: number;
  offset: number;
  data: WalletTransaction[];
}

export interface InternalTransferPayload {
  fromWalletType: WalletApiType;
  toWalletType: WalletApiType;
  amount: string;
}

// ── API functions ──────────────────────────────────────────────────────────

export function getWallets(): Promise<GetWalletsResponse> {
  return api.get<GetWalletsResponse>('/wallet');
}

export function getWalletTransactions(params?: {
  walletType?: WalletApiType;
  /** Filter to a single tx type — e.g. `'WITHDRAWAL'` for the Withdraw tab. */
  type?: TransactionType;
  limit?: number;
  offset?: number;
}): Promise<GetTransactionsResponse> {
  return api.get<GetTransactionsResponse>('/wallet/transactions', {
    params: {
      ...(params?.walletType && { walletType: params.walletType }),
      ...(params?.type && { type: params.type }),
      limit: params?.limit ?? 10,
      offset: params?.offset ?? 0,
    },
  });
}

/**
 * One row from `GET /wallet/network-bonuses` — paginated trading-profit upline
 * bonuses joined with the originating downline. Used to enrich PROFIT_NETWORK
 * BONUS rows in the transaction history with the downline's email (the bare
 * `reference` on wallet_transactions is just the distribution UUID).
 */
export interface NetworkBonusEntry {
  id: string;
  fromUserId: string;
  fromEmail: string;
  fromWalletAddress: string;
  level: number;
  percentage: number;
  amount: string;
  createdAt: string;
}

export interface GetNetworkBonusesResponse {
  total: number;
  limit: number;
  offset: number;
  data: NetworkBonusEntry[];
}

export function getNetworkBonuses(params?: {
  limit?: number;
  offset?: number;
}): Promise<GetNetworkBonusesResponse> {
  return api.get<GetNetworkBonusesResponse>('/wallet/network-bonuses', {
    params: {
      limit: params?.limit ?? 100,
      offset: params?.offset ?? 0,
    },
  });
}

/**
 * Parses the BE raider-lock error message (English-only) so the FE can render
 * a localized toast instead of leaking the raw English string.
 * BE format: `Raider withdrawal locked: clean turnover $X.XX of required $Y.YY.`
 * Returns `null` when the message doesn't match — caller should fall through.
 */
export function parseRaiderLockMessage(
  msg: unknown,
): { current: string; target: string } | null {
  if (typeof msg !== 'string') return null;
  const m = msg.match(/clean turnover \$([\d.]+) of required \$([\d.]+)/i);
  if (!m) return null;
  return { current: m[1], target: m[2] };
}

/**
 * Raider withdrawal-unlock progress — mirrors the BE withdrawal gate
 * (`assertRaiderQualifiedForWithdrawal`). All numeric fields are 6-decimal
 * strings. Non-raiders, and raiders with no positive target, come back as
 * `unlocked: true` / `progressPercent: 100` (no lock applies).
 * Source: GET /wallet/raider-status (BE c19ea46).
 */
export interface RaiderStatus {
  isRaider: boolean;
  target: string;
  cleanTurnover: string;
  remaining: string;
  /** 0–100, two-decimal rounded on the BE. */
  progressPercent: number;
  unlocked: boolean;
}

export function getRaiderStatus(signal?: AbortSignal): Promise<RaiderStatus> {
  return api.get<RaiderStatus>('/wallet/raider-status', { signal });
}

/**
 * Quota progress block — mirrors `TradingProfitService` quota logic on the BE.
 * `maxQuota = tradingBalance × maxBonusPercentage / 100`.
 * `totalReceived = profitInvestment (lifetime TRADING_PROFIT) + profitNetwork (lifetime SPONSOR_REWARD + BONUS)`.
 * Once `isExhausted` is true, daily trading profit stops until the user tops up TRADING.
 */
export interface ProfitQuota {
  tradingBalance:     string;
  rank:               string;
  maxBonusPercentage: number;
  maxQuota:           string;
  profitInvestment:   string;
  profitNetwork:      string;
  totalReceived:      string;
  remainingQuota:     string;
  progressPercentage: number;
  isExhausted:        boolean;
}

export interface ProfitSummary {
  currentBalance:    string;
  investmentBalance: string;
  /** Lifetime TRADING_PROFIT credited to PROFIT_INVESTMENT wallet (daily trading bot payout). */
  tradingProfit:     string;
  /** Lifetime INVESTMENT_RETURN credited to USDT wallet (ROI from investment packages, per rule d.3). */
  investmentProfit:  string;
  /** Lifetime BONUS + SPONSOR_REWARD credited to PROFIT_NETWORK wallet (MLM + jackpot). */
  networkProfit:     string;
  /** tradingProfit + investmentProfit + networkProfit — kumulatif seumur hidup, tidak turun saat ditransfer keluar. */
  totalEarned:       string;
  quota:             ProfitQuota;
}

export function getProfitSummary(): Promise<ProfitSummary> {
  return api.get<ProfitSummary>('/wallet/profit-summary');
}

export interface WithdrawalFeeInfo {
  /** Live PROFIT_INVESTMENT wallet balance — counts toward unlock. */
  piBalance: string;
  /** Live TRADING wallet balance — threshold the user must reach with piBalance to unlock LOW fee. */
  tradingBalance: string;
  /** Live PROFIT_NETWORK wallet balance — shown for reference, does NOT count toward unlock. */
  profitNetworkBalance: string;
  lowFeeUnlocked: boolean;
  feePercent: number;
  /** Minimum withdrawal fee in USD. */
  minFeeUsd: number;
  tier: 'LOW' | 'HIGH';
  remainingToUnlock: string;
}

export function getWithdrawalFeeInfo(): Promise<WithdrawalFeeInfo> {
  return api.get<WithdrawalFeeInfo>('/wallet/withdrawal-fee-info');
}

// ── Withdraw ──────────────────────────────────────────────────────────────────

export interface WithdrawPayload {
  amount: string;
  withdrawalAddress: string;
}

/** USDT auto-withdrawal — gated by an email OTP from /wallet/withdraw-usdt/request-otp. */
export interface WithdrawUsdtPayload {
  amount: string;
  withdrawalAddress: string;
  otpCode: string;
}

export interface WithdrawUsdtResponse {
  id: string;
  amount: string;
  fee: string;
  feeRate: string;
  netAmount: string;
  withdrawalAddress: string;
  /** 'COMPLETED' on successful on-chain broadcast. */
  status: string;
  /** On-chain transaction hash returned after auto-execute. */
  txHash: string;
}

export interface WithdrawProfitResponse {
  id: string;
  amount: string;
  fee: string;
  feeRate: string;
  netAmount: string;
  withdrawalAddress: string;
  status: string;
  quotaInfo: {
    totalPassiveBonus: string;
    totalDeposit: string;
    bonusReachedThreshold: boolean;
  };
}

/** Request an email OTP for the auto-execute USDT withdrawal flow. 60s cooldown enforced by BE. */
export function requestUsdtWithdrawalOtp(): Promise<{ message: string }> {
  return api.post<{ message: string }>('/wallet/withdraw-usdt/request-otp');
}

/** Withdraw from USDT (Deposit) wallet — auto-executes on-chain after OTP verification. */
export function withdrawUsdt(payload: WithdrawUsdtPayload): Promise<WithdrawUsdtResponse> {
  return api.post<WithdrawUsdtResponse>('/wallet/withdraw-usdt', payload);
}

// ── Withdrawal history (user's own) ──────────────────────────────────────────

export type WithdrawalStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface WithdrawalEntry {
  id: string;
  walletType: string;          // 'USDT' | 'PROFIT_NETWORK' | ...
  amount: string;
  fee: string;
  netAmount: string;
  withdrawalAddress: string;
  status: WithdrawalStatus;
  txHash: string | null;
  createdAt: string;            // ISO
  processedAt: string | null;
}

/**
 * Fetch the authenticated user's withdrawal history (newest first).
 * Optionally filter by status — useful for polling in-flight (PROCESSING) withdrawals.
 */
export function getMyWithdrawals(
  params: { limit?: number; status?: WithdrawalStatus } = {},
  signal?: AbortSignal,
): Promise<WithdrawalEntry[]> {
  const q = new URLSearchParams();
  if (params.limit) q.set('limit', String(params.limit));
  if (params.status) q.set('status', params.status);
  const qs = q.toString();
  return api.get<WithdrawalEntry[]>(
    `/wallet/withdrawals${qs ? `?${qs}` : ''}`,
    { signal },
  );
}

/** Withdraw from PROFIT (Network) wallet to external BEP20 address. Fee: 5% (low) or 20% (high). */
export function withdrawProfit(payload: WithdrawPayload): Promise<WithdrawProfitResponse> {
  return api.post<WithdrawProfitResponse>('/wallet/withdraw', payload);
}

// ── Passive Bonus ─────────────────────────────────────────────────────────────

export interface PassiveBonusSummary {
  currentBalance: string;
  totalPassiveBonusEarned: string;
  totalDeposit: string;
  bonusToDepositRatio: string;
  bonusReachedThreshold: boolean;
  currentWithdrawalFeeRate: string;
}

export interface PassiveBonusEntry {
  id: string;
  type: string;
  amount: string;
  balanceAfter: string;
  reference: string | null;
  description: string | null;
  createdAt: string;
}

export interface PassiveBonusWithdrawalEntry {
  id: string;
  amount: string;
  fee: string;
  netAmount: string;
  withdrawalAddress: string;
  status: string;
  txHash: string | null;
  createdAt: string;
}

export interface GetPassiveBonusResponse {
  summary: PassiveBonusSummary;
  bonusHistory: {
    total: number;
    limit: number;
    offset: number;
    data: PassiveBonusEntry[];
  };
  withdrawalHistory: PassiveBonusWithdrawalEntry[];
}

export function getPassiveBonus(params?: { limit?: number; offset?: number }): Promise<GetPassiveBonusResponse> {
  return api.get<GetPassiveBonusResponse>('/wallet/passive-bonus', {
    params: {
      limit: params?.limit ?? 20,
      offset: params?.offset ?? 0,
    },
  });
}

export function internalTransferWallet(
  payload: InternalTransferPayload
): Promise<{ message: string }> {
  return api.post<{ message: string }>('/wallet/internal-transfer', payload);
}

