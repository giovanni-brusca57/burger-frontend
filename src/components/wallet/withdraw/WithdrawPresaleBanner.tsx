import { useTranslation } from 'react-i18next';
import { Coins } from 'lucide-react';

import { formatBalance } from '@/lib/helpers';
import type { PresaleEligibility } from '@/lib/presale';

interface Props {
  eligibility: PresaleEligibility;
  /** Navigate to /presale and close the parent withdraw modal. */
  onGoToPresale: () => void;
}

/**
 * Top-of-modal banner showing presale token-purchase requirement state.
 * Locked variant blocks withdrawals; met variant just confirms eligibility.
 */
export function WithdrawPresaleBanner({ eligibility, onGoToPresale }: Props) {
  const { t } = useTranslation();

  if (!eligibility.eligible) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3.5 py-3 flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-500/20">
          <Coins className="size-4 text-red-400" />
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-xs font-bold text-red-400">{t('wallet.withdrawLockedTitle')}</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t('wallet.withdrawLockedDesc', { amount: formatBalance(eligibility.requiredTokens) })}
            {' '}
            {t('wallet.withdrawLockedSpent')}:{' '}
            <span className="font-bold text-foreground">{formatBalance(eligibility.totalTokens)} $BURG</span>{' '}
            · {t('wallet.withdrawLockedRemaining')}:{' '}
            <span className="font-bold text-red-400">{formatBalance(eligibility.remainingTokens)} $BURG</span>
          </p>
          <button
            type="button"
            onClick={onGoToPresale}
            className="text-[11px] font-semibold text-red-400 underline underline-offset-2 hover:text-red-300"
          >
            {t('wallet.withdrawLockedCta')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 flex items-center gap-2 text-[11px]">
      <Coins className="size-3.5 text-emerald-400" />
      <span className="text-emerald-400 font-semibold">{t('wallet.withdrawTokenMet')}</span>
      <span className="text-muted-foreground">
        · {t('wallet.withdrawPurchased', { amount: formatBalance(eligibility.totalSpent) })}
      </span>
    </div>
  );
}
