import { useTranslation } from 'react-i18next';
import { Download, Upload, SendHorizonal, MoreHorizontal, Repeat2, TrendingUp, Zap } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { fmtAmount, type ProfitSummary } from '@/lib/wallet';
import { WALLET_CONFIG, WALLET_ORDER, type Wallet, type WalletAction, type WalletApiType } from './wallet.types';

/**
 * Per-wallet illustration + accent hue. Image lives under /public/wallet-*.svg.
 * Single source of truth — adding a new wallet type means one entry here.
 */
const WALLET_VISUALS: Record<WalletApiType, { image: string; accent: string }> = {
  USDT:              { image: '/wallet-deposit.svg',    accent: 'oklch(0.72 0.17 152)' },  // emerald
  TRADING:           { image: '/wallet-trading.svg',    accent: 'oklch(0.82 0.18 80)'  },  // amber/gold
  PROFIT_INVESTMENT: { image: '/wallet-investment.svg', accent: 'oklch(0.85 0.18 200)' },  // cyan
  PROFIT_NETWORK:    { image: '/wallet-network.svg',    accent: 'oklch(0.72 0.22 295)' },  // violet
};

function ActionButton({
  action,
  onClick,
}: {
  action: WalletAction;
  onClick?: () => void;
}) {
  const { t } = useTranslation();
  const config: Partial<Record<WalletAction, { variant: string; icon: React.ElementType; label: string }>> = {
    deposit:            { variant: 'neon-btn--mint',   icon: Download,      label: t('wallet.deposit') },
    submit:             { variant: 'neon-btn--blue',   icon: SendHorizonal, label: t('wallet.actionSubmit') },
    'internal-transfer':{ variant: 'neon-btn--gold',   icon: Repeat2,       label: t('wallet.internalTransfer') },
    withdraw:           { variant: 'neon-btn--rose',   icon: Upload,        label: t('wallet.withdraw') },
    reinvest:           { variant: 'neon-btn--violet', icon: Repeat2,       label: t('wallet.reinvest') },
  };
  const c = config[action];
  if (!c) return null;
  const Icon = c.icon;
  return (
    <button className={cn('neon-btn', c.variant)} onClick={onClick}>
      <Icon className="size-3" />
      <span>{c.label}</span>
    </button>
  );
}

const ACTION_ICONS: Partial<Record<WalletAction, React.ReactNode>> = {
  deposit: <Download className="size-4" />,
  'internal-transfer': <Repeat2 className="size-4" />,
  withdraw: <Upload className="size-4" />,
  submit: <SendHorizonal className="size-4" />,
  reinvest: <Repeat2 className="size-4" />,
};

function ActionMenu({
  wallet,
  excludeAction,
  onDeposit,
  onInternalTransfer,
  onWithdraw,
  onSubmit,
  onReinvest,
}: {
  wallet: Wallet;
  excludeAction?: WalletAction;
  onDeposit: (w: Wallet) => void;
  onInternalTransfer: (w: Wallet) => void;
  onWithdraw: (w: Wallet) => void;
  onSubmit: (w: Wallet) => void;
  onReinvest: (w: Wallet) => void;
}) {
  const { t } = useTranslation();

  const LABELS: Partial<Record<WalletAction, string>> = {
    deposit: t('wallet.deposit'),
    'internal-transfer': t('wallet.internalTransfer'),
    withdraw: t('wallet.withdraw'),
    submit: t('wallet.actionSubmit'),
    reinvest: t('wallet.reinvest'),
  };

  const HANDLERS: Partial<Record<WalletAction, () => void>> = {
    deposit: () => onDeposit(wallet),
    'internal-transfer': () => onInternalTransfer(wallet),
    withdraw: () => onWithdraw(wallet),
    submit: () => onSubmit(wallet),
    reinvest: () => onReinvest(wallet),
  };

  const menuActions = wallet.actions.filter(
    (a) => a !== 'none' && a !== excludeAction
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="neon-btn neon-btn--icon neon-btn--white" aria-label={t('wallet.moreActions') || 'More actions'}>
          <MoreHorizontal className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {menuActions.map((action) => (
          <DropdownMenuItem
            key={action}
            onClick={HANDLERS[action]}
            className="gap-2.5"
          >
            {ACTION_ICONS[action]}
            {LABELS[action]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function WalletRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6">
      <Skeleton className="size-12 shrink-0 rounded-2xl" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="hidden sm:flex items-center gap-1.5">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
      </div>
      <div className="sm:hidden">
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
    </div>
  );
}

// ── Profit Quota Progress Bar ──────────────────────────────────────────────────

function ProfitQuotaBar({ earned, quota }: { earned: number; quota: number }) {
  const { t } = useTranslation();
  if (quota === 0) {
    return (
      <div className="mt-2 flex items-center gap-1.5">
        <div className="h-1.5 flex-1 rounded-full bg-muted/40" />
        <span className="text-[10px] text-muted-foreground/50">{t('wallet.quotaNoActive')}</span>
      </div>
    );
  }

  const pct    = Math.min((earned / quota) * 100, 100);
  const isFull = earned >= quota;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center justify-between">
        <span className="eyebrow">{t('wallet.profitQuota')}</span>
        {isFull ? (
          <span className="flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider text-fuchsia-400">
            <Zap className="size-2.5" />
            {t('wallet.quotaFull')}
          </span>
        ) : (
          <span className="metric-figure text-[11px] text-foreground">{pct.toFixed(0)}%</span>
        )}
      </div>
      {/* Live "menyala-nyala" LED meter: traveling sweep + pulsing halo + 12 ticks */}
      <div className="quota-bar-shell h-2.5 w-full">
        <div
          className={cn('quota-bar-fill', isFull && 'quota-bar-fill--full')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/70 metric-figure">
          {t('wallet.quotaEarnedCap', { earned: fmtAmount(earned.toString()), cap: fmtAmount(quota.toString()) })}
        </span>
      </div>
      {isFull && (
        <p className="text-[10px] text-fuchsia-400 font-semibold leading-tight">
          {t('wallet.quotaFullMessage')}
        </p>
      )}
    </div>
  );
}

export function WalletAssets({
  wallets,
  loading,
  profitSummary,
  onDeposit,
  onInternalTransfer,
  onWithdraw,
  onSubmit,
  onReinvest,
}: {
  wallets: Wallet[];
  loading: boolean;
  profitSummary: ProfitSummary | null;
  onDeposit: (wallet: Wallet) => void;
  onInternalTransfer: (wallet: Wallet) => void;
  onWithdraw: (wallet: Wallet) => void;
  onSubmit: (wallet: Wallet) => void;
  onReinvest: (wallet: Wallet) => void;
}) {
  const { t } = useTranslation();

  const resolveClick = (action: WalletAction, wallet: Wallet) => {
    if (action === 'deposit') return () => onDeposit(wallet);
    if (action === 'internal-transfer') return () => onInternalTransfer(wallet);
    if (action === 'withdraw') return () => onWithdraw(wallet);
    if (action === 'submit') return () => onSubmit(wallet);
    if (action === 'reinvest') return () => onReinvest(wallet);
    return undefined;
  };

  const quota         = profitSummary?.quota ?? null;
  const maxQuota      = quota ? parseFloat(quota.maxQuota) : 0;
  const totalReceived = quota ? parseFloat(quota.totalReceived) : 0;
  const quotaFull     = quota?.isExhausted ?? false;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 pt-4 px-4 sm:px-6">
        <CardTitle className="eyebrow">
          // {t('wallet.availableAssets')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/60">
          {loading
            ? WALLET_ORDER.map((type) => (
                <WalletRowSkeleton key={type} />
              ))
            : wallets.map((wallet) => {
                const visual = WALLET_VISUALS[wallet.apiType];
                const isTrading = wallet.apiType === 'TRADING';
                const isDW = wallet.apiType === 'USDT';
                const dwShowReinvest = isDW && quotaFull;

                const effectiveActions: WalletAction[] = (quotaFull || dwShowReinvest)
                  ? [...wallet.actions.filter((a) => a !== 'none'), 'reinvest']
                  : wallet.actions.filter((a) => a !== 'none');

                const effectivePrimary: WalletAction = quotaFull ? 'reinvest' : wallet.primaryAction;

                return (
                  <div key={wallet.id}>
                    <div
                      className={cn(
                        'relative px-4 py-4 sm:px-6 transition-colors',
                        quotaFull && isTrading && 'bg-violet-500/5'
                      )}
                      style={{
                        /* Left-edge accent rail tinted to the wallet's hue */
                        boxShadow: `inset 3px 0 0 0 color-mix(in oklab, ${visual?.accent ?? 'var(--primary)'} 70%, transparent)`,
                      }}
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        {/* Per-wallet illustration */}
                        <div className="relative shrink-0">
                          <div
                            className="flex size-14 items-center justify-center rounded-2xl border overflow-hidden"
                            style={{
                              borderColor: `color-mix(in oklab, ${visual?.accent ?? 'var(--primary)'} 45%, var(--border))`,
                              background: `radial-gradient(circle at 30% 30%, color-mix(in oklab, ${visual?.accent ?? 'var(--primary)'} 22%, transparent), transparent 70%), color-mix(in oklab, ${visual?.accent ?? 'var(--primary)'} 6%, var(--card))`,
                              boxShadow: `0 0 18px -6px color-mix(in oklab, ${visual?.accent ?? 'var(--primary)'} 55%, transparent), inset 0 1px 0 color-mix(in oklab, ${visual?.accent ?? 'var(--primary)'} 22%, transparent)`,
                            }}
                          >
                            {visual?.image ? (
                              <img
                                src={visual.image}
                                alt=""
                                aria-hidden
                                draggable={false}
                                className="size-full object-contain p-1.5 select-none"
                              />
                            ) : (
                              <span className="text-xs font-bold tracking-wider text-foreground/70">{wallet.abbr}</span>
                            )}
                          </div>
                          {quotaFull && isTrading && (
                            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-violet-600 text-[9px] font-bold text-white ring-2 ring-card">
                              !
                            </span>
                          )}
                        </div>

                        {/* Name + balance + (optional) quota bar */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold leading-tight truncate text-foreground">
                            {wallet.name}
                          </p>
                          <p
                            className="metric-figure text-base mt-0.5 leading-none"
                            style={{ color: visual?.accent }}
                          >
                            {fmtAmount(wallet.balance)} <span className="text-[10px] text-muted-foreground/70 font-medium tracking-wider">{wallet.unit}</span>
                          </p>
                          {isTrading && <ProfitQuotaBar earned={totalReceived} quota={maxQuota} />}
                        </div>

                        {/* Mobile/tablet: primary action + overflow menu. Full button
                            row needs ~455px, so anything below lg would overlap the
                            name/balance column (it collapses to 0 via min-w-0). */}
                        <div className="lg:hidden shrink-0 flex items-center gap-1.5">
                          <ActionButton
                            action={effectivePrimary}
                            onClick={resolveClick(effectivePrimary, wallet)}
                          />
                          {effectiveActions.filter((a) => a !== effectivePrimary).length > 0 && (
                            <ActionMenu
                              wallet={wallet}
                              excludeAction={effectivePrimary}
                              onDeposit={onDeposit}
                              onInternalTransfer={onInternalTransfer}
                              onWithdraw={onWithdraw}
                              onSubmit={onSubmit}
                              onReinvest={onReinvest}
                            />
                          )}
                        </div>

                        {/* Desktop (≥lg): individual buttons */}
                        <div className="hidden lg:flex items-center gap-1.5 shrink-0">
                          {effectiveActions.map((action) => (
                            <ActionButton
                              key={action}
                              action={action}
                              onClick={resolveClick(action, wallet)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {quotaFull && isTrading && (
                      <div className="mx-4 mb-3 sm:mx-6 rounded-xl border border-violet-500/30 bg-violet-500/8 px-3 py-2 flex items-start gap-2">
                        <TrendingUp className="size-3.5 text-violet-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[11px] font-semibold text-violet-300">
                            {t('wallet.quotaFullBannerTitle')}
                          </p>
                          <p className="text-[10px] text-violet-400/70 mt-0.5">
                            {t('wallet.quotaFullBannerDesc')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
        </div>
      </CardContent>
    </Card>
  );
}

// Silence unused-import warning — WALLET_CONFIG is intentionally exported above
// from this module's typed map for callers that need static config (e.g.
// skeleton row coloring previously). We retain the import to keep parity with
// the historical surface even though the new tile design no longer references it.
void WALLET_CONFIG;
