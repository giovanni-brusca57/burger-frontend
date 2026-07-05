import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';

import { formatBalance } from '@/lib/helpers';
import type { RaiderStatus } from '@/lib/wallet';

interface Props {
  status: RaiderStatus;
}

/**
 * Top-of-modal banner showing a raider's progress toward unlocking fund
 * movement out of the platform (clean downline turnover ≥ target). Mirrors the
 * BE withdrawal gate. Renders nothing for non-raiders and already-unlocked
 * raiders — only the still-locked state is actionable.
 */
export function RaiderStatusBanner({ status }: Props) {
  const { t } = useTranslation();

  if (!status.isRaider || status.unlocked) return null;

  const pct = Math.max(0, Math.min(100, status.progressPercent));

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3.5 py-3 flex items-start gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
        <Lock className="size-4 text-amber-400" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <p className="text-xs font-bold text-amber-400">{t('wallet.raiderStatusTitle')}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {t('wallet.raiderStatusDesc')}
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-500/15">
          <div
            className="h-full rounded-full bg-amber-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {t('wallet.raiderStatusProgress', {
            current: formatBalance(status.cleanTurnover),
            target: formatBalance(status.target),
            percent: pct,
          })}
          {' · '}
          <span className="font-bold text-amber-400">
            {t('wallet.raiderStatusRemaining', { amount: formatBalance(status.remaining) })}
          </span>
        </p>
      </div>
    </div>
  );
}
