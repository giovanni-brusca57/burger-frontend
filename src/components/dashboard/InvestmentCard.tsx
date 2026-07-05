import { useTranslation } from 'react-i18next';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { formatBalance } from '@/lib/helpers';
import type { ProfitSummary } from '@/lib/wallet';

interface Props {
  tradingBalance: string;
  loadingWallets: boolean;
  isAuthenticated: boolean;
  profitSummary: ProfitSummary | null;
}

/**
 * Trading Wallet card — mirrors the Portfolio "Trading Wallet" tile exactly.
 *   • wallet-tile--gold shell (top centered rail + radial halo + hex badge)
 *   • Orbitron amount with neon glow
 *   • Animated LED quota bar (.quota-bar-shell + .quota-bar-fill, gold)
 *   • Magenta variant when quota is exhausted (matches My Wallet page)
 */
export function InvestmentCard({
  tradingBalance,
  loadingWallets,
  isAuthenticated,
  profitSummary,
}: Props) {
  const { t } = useTranslation();
  const quota = profitSummary?.quota ?? null;
  const maxQuota = quota ? parseFloat(quota.maxQuota) : 0;
  const showQuota = isAuthenticated && quota !== null && maxQuota > 0;
  const totalReceived = quota ? parseFloat(quota.totalReceived) : 0;
  const pct = Math.min(quota?.progressPercentage ?? 0, 100);
  const full = quota?.isExhausted ?? false;

  return (
    <div className="wallet-tile wallet-tile--gold h-full">
      <div className="wallet-tile-head">
        <span className="wallet-tile-label">{t('dashboard.burgerInvestment')}</span>
        <div className="wallet-tile-badge">
          <Bot className="size-3.5" />
        </div>
      </div>

      {loadingWallets && isAuthenticated ? (
        <Skeleton className="h-8 w-28" />
      ) : (
        <p className="wallet-tile-amount">
          {isAuthenticated ? (
            <>
              $<AnimatedNumber value={parseFloat(tradingBalance) || 0} format={formatBalance} />
            </>
          ) : (
            '—'
          )}
        </p>
      )}
      <p className="wallet-tile-sub">USDT · TW</p>

      {showQuota && (
        <div className="mt-auto pt-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold tracking-[0.18em] uppercase text-amber-300/90">
              {t('dashboard.profitQuota')}
            </span>
            <span className={cn(
              'font-cyber text-[13px] font-extrabold tabular-nums tracking-wider',
              full ? 'text-fuchsia-300' : 'text-amber-300',
            )}>
              {full ? '★ FULL' : `${pct.toFixed(0)}%`}
            </span>
          </div>
          {/* Animated LED quota bar — gold default, magenta variant when full */}
          <div className="quota-bar-shell h-3">
            <div
              className={cn('quota-bar-fill', full && 'quota-bar-fill--full')}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between font-mono text-[11px] tracking-wider">
            <span className="text-muted-foreground">
              <span className="font-bold text-foreground tabular-nums">${formatBalance(totalReceived)}</span>
              {' / '}
              <span className="font-bold text-foreground tabular-nums">${formatBalance(maxQuota)}</span>
            </span>
            {full && (
              <span className="text-fuchsia-300 font-semibold">
                {t('dashboard.quotaFullHint')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
