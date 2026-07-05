import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  TrendingUp,
  Gift,
  Star,
  Repeat,
  LineChart,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  ExternalLink,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TablePagination } from '@/components/common/TablePagination';
import { cn } from '@/lib/utils';
import {
  fmtAmount,
  type WalletTransaction,
  type TransactionType,
  type WithdrawalEntry,
  type WithdrawalStatus,
} from '@/lib/wallet';
import { formatBalance } from '@/lib/helpers';
import { useWalletStore, type TxFilter } from '@/stores/wallet.store';

// ── Withdrawal status meta (mirrored from the old WithdrawalsHistorySection) ─

const STATUS_META: Record<
  WithdrawalStatus,
  { labelKey: string; bgColor: string; icon: React.ElementType; spin?: boolean }
> = {
  PENDING:    { labelKey: 'wallet.withdrawalStatus.pending',    bgColor: 'bg-slate-500/15 text-slate-300 border-slate-500/30',   icon: Clock     },
  PROCESSING: { labelKey: 'wallet.withdrawalStatus.processing', bgColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',   icon: Loader2, spin: true },
  COMPLETED:  { labelKey: 'wallet.withdrawalStatus.completed',  bgColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  FAILED:     { labelKey: 'wallet.withdrawalStatus.failed',     bgColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30',     icon: AlertCircle },
};

// ── Wallet display config ────────────────────────────────────────────────────
// `rail` is the raw color used by the .tx-block ledger CSS (via --rail).
// The legacy tailwind classes are still emitted so the filter chips above keep
// their existing look — only the row itself moved to the tactical HUD design.

const WALLET_META: Record<string, { abbr: string; name: string; color: string; ring: string; bg: string; dot: string; rail: string }> = {
  USDT:              { abbr: 'DW', name: 'Deposit Wallet',     color: 'text-emerald-400', ring: 'ring-emerald-500/40', bg: 'bg-emerald-500/15', dot: 'bg-emerald-400', rail: 'oklch(0.82 0.18 150)' },
  PROFIT_NETWORK:    { abbr: 'PW', name: 'Profit Wallet',      color: 'text-violet-400',  ring: 'ring-violet-500/40',  bg: 'bg-violet-500/15',  dot: 'bg-violet-400',  rail: 'oklch(0.78 0.18 305)' },
  PROFIT_INVESTMENT: { abbr: 'PF', name: 'Profit Investment',  color: 'text-cyan-400',    ring: 'ring-cyan-500/40',    bg: 'bg-cyan-500/15',    dot: 'bg-cyan-400',    rail: 'oklch(0.85 0.16 215)' },
  TRADING:           { abbr: 'TW', name: 'Trading Wallet',     color: 'text-orange-400',  ring: 'ring-orange-500/40',  bg: 'bg-orange-500/15',  dot: 'bg-orange-400',  rail: 'oklch(0.82 0.18 65)' },
};

// ── Transaction type meta ────────────────────────────────────────────────────

const TX_META: Record<
  TransactionType,
  { labelKey: string; sign: '+' | '-'; color: string; bgColor: string; icon: React.ElementType; tx: string }
> = {
  DEPOSIT:           { labelKey: 'wallet.txTypeDeposit',          sign: '+', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 text-emerald-400',  icon: ArrowDownLeft, tx: 'oklch(0.82 0.18 150)' },
  WITHDRAWAL:        { labelKey: 'wallet.txTypeWithdrawal',       sign: '-', color: 'text-red-400',     bgColor: 'bg-red-500/10 text-red-400',           icon: ArrowUpRight,  tx: 'oklch(0.78 0.18 25)'  },
  TRANSFER_IN:       { labelKey: 'wallet.txTypeTransferIn',       sign: '+', color: 'text-sky-400',     bgColor: 'bg-sky-500/10 text-sky-400',           icon: ArrowDownLeft, tx: 'oklch(0.84 0.14 230)' },
  TRANSFER_OUT:      { labelKey: 'wallet.txTypeTransferOut',      sign: '-', color: 'text-orange-400',  bgColor: 'bg-orange-500/10 text-orange-400',     icon: ArrowUpRight,  tx: 'oklch(0.82 0.18 65)'  },
  INVESTMENT:        { labelKey: 'wallet.txTypeInvestment',       sign: '-', color: 'text-primary',     bgColor: 'bg-primary/10 text-primary',           icon: TrendingUp,    tx: 'oklch(0.85 0.18 200)' },
  INVESTMENT_RETURN: { labelKey: 'wallet.txTypeInvestmentReturn', sign: '+', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 text-emerald-400',   icon: TrendingUp,    tx: 'oklch(0.82 0.18 150)' },
  SPONSOR_REWARD:    { labelKey: 'wallet.txTypeSponsorReward',    sign: '+', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 text-emerald-400',   icon: Gift,          tx: 'oklch(0.82 0.18 150)' },
  BONUS:             { labelKey: 'wallet.txTypeBonus',            sign: '+', color: 'text-primary',     bgColor: 'bg-primary/10 text-primary',           icon: Star,          tx: 'oklch(0.85 0.18 200)' },
  COMPOUND:          { labelKey: 'wallet.txTypeCompound',         sign: '-', color: 'text-violet-400',  bgColor: 'bg-violet-500/10 text-violet-400',     icon: Repeat,        tx: 'oklch(0.78 0.18 305)' },
  TRADING_PROFIT:    { labelKey: 'wallet.txTypeTradingProfit',    sign: '+', color: 'text-cyan-400',    bgColor: 'bg-cyan-500/10 text-cyan-400',         icon: LineChart,     tx: 'oklch(0.85 0.16 215)' },
  SWEEP:             { labelKey: 'wallet.txTypeSweep',            sign: '-', color: 'text-amber-400',   bgColor: 'bg-amber-500/10 text-amber-400',       icon: Send,          tx: 'oklch(0.84 0.16 85)'  },
  TOKEN_PURCHASE:    { labelKey: 'wallet.txTypeTokenPurchase',    sign: '-', color: 'text-amber-400',   bgColor: 'bg-amber-500/10 text-amber-400',       icon: Star,          tx: 'oklch(0.84 0.16 85)'  },
};

// ── Filter tabs (mixed dimension: wallet type + WITHDRAW shortcut) ──────────
// `TxFilter` lives in the wallet store; the store translates each value into
// the right BE query param so pagination + counts come back filtered.

// Filter set is restricted to the 4 BE WalletType values (USDT, PROFIT_NETWORK,
// PROFIT_INVESTMENT, TRADING) plus the "ALL" reset. The WITHDRAW shortcut was
// removed — withdrawals already show up under USDT and are visually distinct
// via the WITHDRAWAL transaction-type badge.
// Each tab carries its own `variant` so the tactical neon-tab CSS can resolve
// the wallet color via --tab-c. ALL uses the primary cyan accent.
const WALLET_TABS: { key: TxFilter; labelKey: string; abbr?: string; variant: string }[] = [
  { key: 'ALL',               labelKey: 'wallet.txFilter.all',                              variant: 'neon-tab--all'    },
  { key: 'USDT',              labelKey: 'wallet.txFilter.deposit',           abbr: 'DW',    variant: 'neon-tab--mint'   },
  { key: 'PROFIT_NETWORK',    labelKey: 'wallet.txFilter.networkProfit',     abbr: 'PW',    variant: 'neon-tab--violet' },
  { key: 'PROFIT_INVESTMENT', labelKey: 'wallet.txFilter.investmentProfit',  abbr: 'PF',    variant: 'neon-tab--cyan'   },
  { key: 'TRADING',           labelKey: 'wallet.txFilter.trading',           abbr: 'TW',    variant: 'neon-tab--gold'   },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function shortRef(ref: string) {
  if (ref.length <= 14) return ref;
  return `${ref.slice(0, 8)}…${ref.slice(-5)}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ── Transaction row ──────────────────────────────────────────────────────────

function TxRow({ tx, withdrawal }: { tx: WalletTransaction; withdrawal?: Omit<WithdrawalEntry, 'createdAt'> }) {
  const { t } = useTranslation();
  const meta   = TX_META[tx.type] ?? { labelKey: tx.type, sign: '+' as const, color: 'text-foreground', bgColor: 'bg-muted text-foreground', icon: ArrowLeftRight, tx: 'oklch(0.7 0.02 250)' };
  const wallet = WALLET_META[tx.walletType] ?? { abbr: tx.walletType, name: tx.walletType, color: 'text-foreground', ring: 'ring-border', bg: 'bg-muted', dot: 'bg-muted-foreground', rail: 'oklch(0.7 0.02 250)' };
  const TxIcon = meta.icon;
  const statusMeta = withdrawal ? STATUS_META[withdrawal.status] : null;
  const StatusIcon = statusMeta?.icon;

  const onchainHash = withdrawal?.txHash ?? null;
  const refLabelKey =
    tx.walletType === 'USDT'           ? 'wallet.txHashLabel'      :
    tx.walletType === 'PROFIT_NETWORK' ? 'wallet.referrerAddress'  :
    tx.walletType === 'TRADING'        ? 'wallet.transactionId'    :
    'wallet.refLabel';
  const fromEmail = tx.type === 'BONUS' ? tx.from?.email ?? null : null;
  const referenceValue = fromEmail ?? (tx.reference ? shortRef(tx.reference) : null);

  // Tactical ledger block — synthwave HUD with left rail + flow line + Orbitron readout.
  // CSS vars `--rail` and `--tx` drive the row's per-wallet / per-type accent colors.
  return (
    <div
      className="tx-block"
      style={{ ['--rail' as never]: wallet.rail, ['--tx' as never]: meta.tx }}
    >
      {/* TOP STRIP — wallet chip + flow line + amount readout */}
      <div className="tx-strip">
        <span className="tx-chip">{wallet.abbr}</span>
        <span className="tx-flow" aria-hidden="true" />
        <span className={cn('tx-readout', meta.sign === '+' ? 'tx-readout--pos' : 'tx-readout--neg')}>
          {meta.sign}{fmtAmount(Math.abs(parseFloat(String(tx.amount))))}
          <span className="tx-unit">USDT</span>
        </span>
      </div>

      {/* MID STRIP — type pill + wallet name + (withdrawal status) + description */}
      <div className="tx-mid">
        <span className="tx-type">
          <TxIcon className="size-3" />
          {t(meta.labelKey)}
        </span>
        {statusMeta && StatusIcon && (
          <span className={cn('tx-status border', statusMeta.bgColor)}>
            <StatusIcon className={cn('size-2.5', statusMeta.spin && 'animate-spin')} />
            {t(statusMeta.labelKey)}
          </span>
        )}
        <span className="tx-wallet-tag">{wallet.name}</span>
        {withdrawal ? (
          <span className="tx-desc">
            → {shortRef(withdrawal.withdrawalAddress)}
            {' · '}
            {t('wallet.fee')} ${formatBalance(withdrawal.fee)}
            {' · '}
            {t('wallet.net')} ${formatBalance(withdrawal.netAmount)}
          </span>
        ) : (
          tx.description && <span className="tx-desc">{tx.description}</span>
        )}
      </div>

      {/* BOT STRIP — reference / timestamp / balance tag */}
      <div className="tx-foot">
        {onchainHash ? (
          <a
            href={`https://bscscan.com/tx/${onchainHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="tx-foot-link"
          >
            {shortRef(onchainHash)}
            <ExternalLink className="size-2.5" />
          </a>
        ) : (
          referenceValue && (
            <span className="tx-foot-ref">
              <span className="tx-foot-sep">›</span> {t(refLabelKey)} {referenceValue}
            </span>
          )
        )}
        <span className="tx-foot-sep">·</span>
        <span className="tx-foot-time">{fmtDate(tx.createdAt)}</span>
        <span className="tx-bal">
          <span className="tx-bal-label">BAL</span>
          <span className="tx-bal-value">{fmtAmount(tx.balanceAfter)}</span>
        </span>
      </div>
    </div>
  );
}

// ── Empty / Loading states ───────────────────────────────────────────────────

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
      <div className="size-10 rounded-full bg-muted flex items-center justify-center">
        <span className="text-xl">—</span>
      </div>
      <p className="text-sm">{t('wallet.noTransactions')}</p>
    </div>
  );
}

function LoadingState() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
      <RefreshCw className="size-4 animate-spin" />
      <span className="text-sm">{t('common.loading')}</span>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function WalletHistory({
  transactions,
  loading,
  total,
  page,
  pageSize,
  onPageChange,
  onRefresh,
  rateLimitedUntil,
}: {
  transactions: WalletTransaction[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  rateLimitedUntil?: number | null;
}) {
  const { t } = useTranslation();
  // Filter is server-side now — store translates the active tab into the
  // right BE query and clears its page cache on change. The PROFIT_NETWORK
  // filter is special-cased in the store to fetch /wallet/network-bonuses,
  // which already joins in the downline email.
  const walletFilter = useWalletStore((s) => s.txFilter);
  const setTxFilter = useWalletStore((s) => s.setTxFilter);
  const [cooldownSec, setCooldownSec] = useState(0);

  useEffect(() => {
    if (!rateLimitedUntil) { setCooldownSec(0); return; }
    const tick = () => setCooldownSec(Math.max(0, Math.ceil((rateLimitedUntil - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [rateLimitedUntil]);

  // BE already returned filtered rows — no second-pass filtering needed.
  // Active-tab count uses `total` (server total). Other tabs hide the badge
  // since we can't know their counts without N extra requests.

  return (
    <Card className="overflow-hidden border-border/50">
      {/* ── Tactical command bar ── */}
      <div className="tx-cmdbar">
        <div className="flex items-center gap-2">
          <span className="tx-cmdbar-title">
            <ArrowLeftRight className="size-3.5" />
            Transaction History
          </span>
          <span className="tx-cmdbar-live">LIVE</span>
        </div>
        <Tooltip open={cooldownSec > 0 ? undefined : false}>
          <TooltipTrigger asChild>
            <span className="inline-flex">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-6 shrink-0 rounded-full p-0 hover:text-foreground',
                cooldownSec > 0
                  ? 'w-auto px-1.5 gap-1 bg-amber-500/20 text-white hover:bg-amber-500/30'
                  : 'w-6 text-muted-foreground',
              )}
              onClick={onRefresh}
              disabled={loading || cooldownSec > 0}
              aria-label="Refresh"
            >
              <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
              {cooldownSec > 0 && (
                <span className="text-[10px] tabular-nums font-bold text-white">{cooldownSec}s</span>
              )}
            </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Please wait {cooldownSec}s</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <CardContent className="p-0">
        {/* ── Tactical wallet filter row ──
            Each chip carries its own wallet abbreviation + the full label, so
            the legend strip we used to show below is now folded in here. */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border/40 overflow-x-auto scrollbar-none">
          {WALLET_TABS.map((tab) => {
            const isActive = walletFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setTxFilter(tab.key)}
                className={cn('neon-tab', tab.variant, isActive && 'is-active')}
              >
                {tab.abbr && <span className="neon-tab-abbr">{tab.abbr}</span>}
                {t(tab.labelKey)}
                {/* Active-tab badge — server-filtered total. */}
                {isActive && total > 0 && (
                  <span className="neon-tab-count">{total}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Transaction list ── */}
        {loading ? (
          <LoadingState />
        ) : transactions.length === 0 ? (
          <EmptyState />
        ) : (
          <div>
            {transactions.map((tx) => (
              <TxRow key={tx.id} tx={tx} withdrawal={tx.withdrawal} />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {total > 0 && (
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            loading={loading}
            onPageChange={onPageChange}
          />
        )}
      </CardContent>
    </Card>
  );
}
