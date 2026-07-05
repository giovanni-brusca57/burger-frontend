import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';
import { formatBalance } from '@/lib/helpers';
import type { WithdrawalFeeInfo } from '@/lib/wallet';

interface Props {
  /** Latest fee-info snapshot from /wallet/withdrawal-fee-info, or null while it resolves. */
  feeInfo: WithdrawalFeeInfo | null;
  /** Effective percent — falls back to 20 (worst case) until feeInfo resolves. */
  feePercent: number;
  /** Minimum fee floor in USD — falls back to 3 (BE policy) until feeInfo resolves. */
  fee: number;
  /** Net amount user will receive after fee. */
  toReceive: number;
  /** Wallet display unit (e.g. "USDT", "USD") for the fee/receive lines. */
  walletUnit: string;
  /** Whether to show the rolling-24h cap hint (USDT auto-withdraw only). */
  showUsdtCapHint: boolean;
}

/**
 * Fee tier card + fee/receive summary + min-fee disclosure + contextual amber
 * floor hint + USDT 24h cap hint. All read-only display — no handlers.
 */
export function WithdrawFeeSummary({
  feeInfo,
  feePercent,
  fee,
  toReceive,
  walletUnit,
  showUsdtCapHint,
}: Props) {
  const { t } = useTranslation();

  return (
    <>
      {feeInfo && (
        <div
          className={cn(
            'rounded-lg border px-3 py-2 text-[11px] space-y-1',
            feeInfo.lowFeeUnlocked
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-amber-500/30 bg-amber-500/5',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold">
              {feeInfo.lowFeeUnlocked ? t('wallet.feeTierLowUnlocked') : t('wallet.feeTierStandard')}
            </span>
            <span
              className={cn(
                'font-bold',
                feeInfo.lowFeeUnlocked ? 'text-emerald-400' : 'text-amber-400',
              )}
            >
              {t('wallet.feeTierPercent', { percent: feeInfo.feePercent })}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {t('wallet.feeTierInvProfit')}:{' '}
            <span className="font-bold text-foreground">${formatBalance(feeInfo.piBalance)}</span> /
            {t('wallet.feeTierTradeInv')}:{' '}
            <span className="font-bold text-foreground">${formatBalance(feeInfo.tradingBalance)}</span>
          </p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {feeInfo.lowFeeUnlocked
              ? t('wallet.feeTierUnlockedPermanent')
              : t('wallet.feeTierNeedMore', { amount: feeInfo.remainingToUnlock })}
          </p>
        </div>
      )}

      <div className="space-y-1 text-center">
        <p className="text-xs text-muted-foreground">
          {t('wallet.withdrawFee', { amount: formatBalance(fee), unit: walletUnit })}
          <span className="text-muted-foreground/60"> ({feePercent}%)</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {t('wallet.withdrawAmountToReceive', { amount: formatBalance(toReceive), unit: walletUnit })}
        </p>
        {showUsdtCapHint && (
          <p className="text-[10px] text-muted-foreground/70 leading-tight pt-0.5">
            {t('wallet.withdrawUsdtCapHint')}
          </p>
        )}
      </div>
    </>
  );
}
