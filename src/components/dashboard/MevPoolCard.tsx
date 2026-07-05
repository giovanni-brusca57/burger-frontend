import { useTranslation } from 'react-i18next';
import { Coins } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { formatBalance } from '@/lib/helpers';
import {
  getUserTzAbbr,
  isUserInUtc,
  utcTimeShort,
} from '@/lib/time';

interface MevBatchEntry {
  batchNumber: number;
  percentage: string;
  createdAt: string;
}

interface Props {
  mevPool: string;
  recentBatches: MevBatchEntry[];
}

// Seed value displayed before the BE-reported global pool is added on top.
const POOL_BASE_USD = 50_500;

/**
 * Pool / Total Burger Investment card.
 * Reuses the .wallet-tile pattern from the Portfolio "Available Balance"
 * row so the dashboard headline cards feel coherent with the wallet UI.
 *   • Gold accent (top centered rail + radial halo)
 *   • Hex badge with coin/pool icon
 *   • Mono label · Orbitron amount · mono sub-line
 *   • Recent batches strip at the bottom
 */
export function MevPoolCard({ mevPool, recentBatches }: Props) {
  const { t, i18n } = useTranslation();
  const totalPool = POOL_BASE_USD + (parseFloat(mevPool) || 0);
  const dateLocale = i18n.language || undefined;
  const userIsInUtc = isUserInUtc();
  const userTzAbbr = getUserTzAbbr();

  return (
    <div className="wallet-tile wallet-tile--gold h-full">
      <div className="wallet-tile-head">
        <span className="wallet-tile-label">{t('dashboard.totalMevInvestment')}</span>
        <div className="wallet-tile-badge">
          <Coins className="size-3.5" />
        </div>
      </div>
      <p className="wallet-tile-amount">
        $<AnimatedNumber value={totalPool} format={formatBalance} />
      </p>
      <p className="wallet-tile-sub">{t('dashboard.globalPool')}</p>

      <p className="font-mono text-[12px] tracking-wide text-muted-foreground/75 leading-snug">
        {t('dashboard.automatedMevFooter')}
      </p>

      <div className="mt-auto pt-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          <span className="text-amber-300/70">›</span> {t('dashboard.recentBatches')}{' '}
          {recentBatches.length > 0 && (
            <span className="text-muted-foreground/60 normal-case tracking-normal">
              {t('dashboard.recentBatchesCount', { count: recentBatches.length })}
            </span>
          )}
        </p>

        {/* LED equalizer — one bar per recent batch, oldest → newest */}
        {recentBatches.length > 1 && (() => {
          const chrono = [...recentBatches].reverse();
          const vals = chrono.map((b) => parseFloat(b.percentage) || 0);
          const min = Math.min(...vals);
          const max = Math.max(...vals);
          return (
            <div className="mb-2 flex h-6 items-end gap-[3px]" aria-hidden>
              {chrono.map((b, i) => {
                const h = 34 + 66 * (max > min ? (vals[i] - min) / (max - min) : 1);
                return (
                  <div
                    key={i}
                    title={`+${b.percentage}%`}
                    className="flex-1 rounded-[2px] bg-gradient-to-t from-emerald-500/40 to-emerald-300/90"
                    style={{ height: `${h}%` }}
                  />
                );
              })}
            </div>
          );
        })()}

        {recentBatches.length > 0 ? (
          <div className="grid grid-cols-3 gap-1.5">
            {recentBatches.slice(0, 3).map((b) => {
              const d = new Date(b.createdAt);
              const dateStr = d.toLocaleDateString(dateLocale, { day: '2-digit', month: 'short' });
              const timeStr = d.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' });
              const utcStr = utcTimeShort(b.createdAt);
              const tooltip = userIsInUtc
                ? `${dateStr} · ${utcStr} UTC`
                : `${dateStr} · ${utcStr} UTC (${timeStr} ${userTzAbbr})`;
              return (
                <div
                  key={b.batchNumber}
                  title={tooltip}
                  className="rounded-lg border border-amber-400/25 bg-amber-400/5 px-2 py-2 text-center"
                >
                  <span className="font-cyber text-[13px] font-extrabold text-emerald-300 block tabular-nums leading-tight">
                    +{b.percentage}%
                  </span>
                  <span className="font-mono text-[10px] tracking-wider text-muted-foreground/75 uppercase">
                    {dateStr}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-11 rounded-lg" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
