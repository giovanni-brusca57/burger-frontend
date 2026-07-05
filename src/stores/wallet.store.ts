import { create } from 'zustand';
import { toast } from 'sonner';

import {
  getWallets,
  getWalletTransactions,
  getProfitSummary,
  getWithdrawalFeeInfo,
  type WalletTransaction,
  type ProfitSummary,
  type WithdrawalFeeInfo,
} from '@/lib/wallet';
import {
  WALLET_CONFIG,
  WALLET_ORDER,
  type Wallet,
  type WalletApiType,
} from '@/components/wallet/wallet.types';

/**
 * Transaction history filter — drives both BE query params and the active tab UI.
 *
 *  - 'ALL'                       → no filter
 *  - 'WITHDRAW'                  → BE: `?type=WITHDRAWAL` (cross-wallet)
 *  - WalletApiType (USDT, …)     → BE: `?walletType=…`
 *
 * `txTotal` from the BE response reflects the filtered count, so pagination
 * stays in sync without any extra requests.
 */
export type TxFilter = 'ALL' | 'WITHDRAW' | WalletApiType;

/** Data is considered fresh for this duration (ms). */
const STALE_MS = 30_000;
const TX_PAGE_SIZE = 10;

// ── Types ──────────────────────────────────────────────────────────────────

interface TxPage {
  data: WalletTransaction[];
  total: number;
  lastFetched: number;
}

interface WalletStoreState {
  // ── Balances ──
  wallets: Wallet[];
  loadingWallets: boolean;
  walletsLastFetched: number | null;

  // ── Profit summary ──
  profitSummary: ProfitSummary | null;
  loadingProfitSummary: boolean;
  profitSummaryLastFetched: number | null;

  // ── Withdrawal fee info ──
  withdrawalFeeInfo: WithdrawalFeeInfo | null;
  loadingFeeInfo: boolean;
  feeInfoLastFetched: number | null;

  // ── Transactions ──
  txPages: Map<number, TxPage>;
  loadingTx: boolean;
  txPage: number;
  txTotal: number;
  pageSize: number;
  /** Active filter — server-side, narrows what BE returns and the total count. */
  txFilter: TxFilter;
  /** Non-null while the refresh button is rate-limited (Unix ms timestamp when cooldown ends). */
  txRateLimitedUntil: number | null;

  // ── Actions ──
  fetchWallets: () => Promise<void>;
  fetchProfitSummary: (opts?: { force?: boolean }) => Promise<void>;
  fetchWithdrawalFeeInfo: () => Promise<void>;
  fetchTx: (page: number, opts?: { force?: boolean }) => Promise<void>;
  setTxPage: (page: number) => void;
  /** Switch filter — clears cache, resets to page 0, and refetches. */
  setTxFilter: (filter: TxFilter) => void;
  /** Invalidate all cached data — call after deposit/transfer mutations. */
  invalidate: () => void;
  /** Full wipe on logout / user switch — clears every field to initial state. */
  reset: () => void;
}

// ── Store ──────────────────────────────────────────────────────────────────

export const useWalletStore = create<WalletStoreState>((set, get) => ({
  wallets: [],
  loadingWallets: false,
  walletsLastFetched: null,

  profitSummary: null,
  loadingProfitSummary: false,
  profitSummaryLastFetched: null,

  withdrawalFeeInfo: null,
  loadingFeeInfo: false,
  feeInfoLastFetched: null,

  txPages: new Map(),
  loadingTx: false,
  txPage: 0,
  txTotal: 0,
  pageSize: TX_PAGE_SIZE,
  txFilter: 'ALL',
  txRateLimitedUntil: null,

  // ── Wallet balances ──

  fetchWallets: async () => {
    const { loadingWallets, walletsLastFetched } = get();
    const now = Date.now();

    if (loadingWallets || (walletsLastFetched !== null && now - walletsLastFetched < STALE_MS)) return;

    set({ loadingWallets: true });
    try {
      const data = await getWallets();
      const walletList = data?.wallets ?? [];
      const merged = WALLET_ORDER.filter((type) =>
        walletList.some((w) => w.type === type)
      ).map((type) => {
        const apiWallet = walletList.find((w) => w.type === type)!;
        return {
          ...WALLET_CONFIG[type],
          balance: apiWallet.balance,
        };
      });
      set({ wallets: merged, walletsLastFetched: Date.now() });
    } catch (err: any) {
      console.error('[WalletStore] fetchWallets error:', err);
      toast.error(err?.message ?? 'Failed to load wallet data.');
    } finally {
      set({ loadingWallets: false });
    }
  },

  // ── Profit summary ──

  fetchProfitSummary: async (opts) => {
    const { loadingProfitSummary, profitSummaryLastFetched } = get();
    const now = Date.now();

    if (loadingProfitSummary) return;
    if (!opts?.force && profitSummaryLastFetched !== null && now - profitSummaryLastFetched < STALE_MS) return;

    set({ loadingProfitSummary: true });
    try {
      const data = await getProfitSummary();
      set({ profitSummary: data, profitSummaryLastFetched: Date.now() });
    } catch {
      // silent — callers fall back to null
    } finally {
      set({ loadingProfitSummary: false });
    }
  },

  // ── Withdrawal fee info ──

  fetchWithdrawalFeeInfo: async () => {
    const { loadingFeeInfo, feeInfoLastFetched } = get();
    const now = Date.now();

    if (loadingFeeInfo || (feeInfoLastFetched !== null && now - feeInfoLastFetched < STALE_MS)) return;

    set({ loadingFeeInfo: true });
    try {
      const data = await getWithdrawalFeeInfo();
      set({ withdrawalFeeInfo: data, feeInfoLastFetched: Date.now() });
    } catch {
      // silent — callers fall back to null
    } finally {
      set({ loadingFeeInfo: false });
    }
  },

  // ── Transactions ──

  fetchTx: async (page: number, opts?: { force?: boolean }) => {
    const { loadingTx, txPages, txRateLimitedUntil, txFilter } = get();
    const now = Date.now();

    // Still within cooldown window — do nothing
    if (txRateLimitedUntil !== null && now < txRateLimitedUntil) return;

    const cached = txPages.get(page);
    if (!opts?.force && (loadingTx || (cached && now - cached.lastFetched < STALE_MS))) {
      if (cached) set({ txPage: page, txTotal: cached.total });
      return;
    }

    set({ loadingTx: true, txPage: page });
    try {
      // Translate the filter into BE query params:
      //   'ALL'      → no filter
      //   'WITHDRAW' → ?type=WITHDRAWAL (cross-wallet)
      //   wallet     → ?walletType=…
      const filterParams =
        txFilter === 'ALL'
          ? {}
          : txFilter === 'WITHDRAW'
            ? { type: 'WITHDRAWAL' as const }
            : { walletType: txFilter };

      const res = await getWalletTransactions({
        ...filterParams,
        limit: TX_PAGE_SIZE,
        offset: page * TX_PAGE_SIZE,
      });
      const newPages = new Map(get().txPages);
      newPages.set(page, { data: res.data, total: res.total, lastFetched: Date.now() });
      set({ txPages: newPages, txTotal: res.total, txRateLimitedUntil: null });
    } catch (err: any) {
      if (err?.status === 429) {
        // Rate limited — keep existing data intact, block refresh for 60 seconds
        set({ txRateLimitedUntil: Date.now() + 60_000 });
      } else {
        console.error('[WalletStore] fetchTx error:', err);
        toast.error((err as any)?.message ?? 'Failed to load transaction history.');
      }
    } finally {
      set({ loadingTx: false });
    }
  },

  setTxPage: (page: number) => {
    set({ txPage: page });
    get().fetchTx(page);
  },

  setTxFilter: (filter: TxFilter) => {
    if (get().txFilter === filter) return;
    // Cache is keyed by page only — wipe it on filter change so we don't serve
    // pages from a different filter's response.
    set({ txFilter: filter, txPages: new Map(), txPage: 0, txTotal: 0 });
    get().fetchTx(0, { force: true });
  },

  invalidate: () =>
    set({
      walletsLastFetched: null,
      profitSummaryLastFetched: null,
      feeInfoLastFetched: null,
      txPages: new Map(),
    }),

  /**
   * Full wipe on logout / user switch. Clears ALL fields (data + timestamps +
   * UI state like txFilter/txPage) so the next session can't briefly render
   * the previous user's wallets, profit summary, or paginated transactions
   * during the new fetch.
   */
  reset: () =>
    set({
      wallets: [],
      loadingWallets: false,
      walletsLastFetched: null,
      profitSummary: null,
      loadingProfitSummary: false,
      profitSummaryLastFetched: null,
      withdrawalFeeInfo: null,
      loadingFeeInfo: false,
      feeInfoLastFetched: null,
      txPages: new Map(),
      loadingTx: false,
      txPage: 0,
      txTotal: 0,
      txFilter: 'ALL',
      txRateLimitedUntil: null,
    }),
}));

// ── Selectors ──────────────────────────────────────────────────────────────

/** Stable fallback so the selector always returns the same reference when empty. */
const EMPTY_TX: WalletTransaction[] = [];

/** Returns the transactions for the currently active page (empty array if not yet fetched). */
export function selectCurrentTxData(state: WalletStoreState): WalletTransaction[] {
  return state.txPages.get(state.txPage)?.data ?? EMPTY_TX;
}

// ── Dev preview hook ───────────────────────────────────────────────────────
// Exposes the store on window so DevTools console can seed mock data when the
// backend isn't running. Gated by Vite's DEV flag — stripped from prod builds.
if (import.meta.env.DEV) {
  (window as unknown as { __walletStore?: typeof useWalletStore }).__walletStore = useWalletStore;
}
