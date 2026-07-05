import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatBalance } from '@/lib/helpers';

interface Props {
  value: string;
  onChange: (next: string) => void;
  /** Locked once the OTP has been requested — input becomes read-only and "All" hides. */
  disabled: boolean;
  walletBalance: string;
  walletUnit: string;
  isInsufficient: boolean;
  isBelowMin: boolean;
  /** $10 today — used in the inline warning copy. */
  minAmount: number;
  /** Click "All" → fill the input with current balance. */
  onMaxClick: () => void;
}

/** Withdrawal-amount input + inline warnings for "below min" and "exceeds balance". */
export function WithdrawAmountField({
  value,
  onChange,
  disabled,
  walletBalance,
  walletUnit,
  isInsufficient,
  isBelowMin,
  minAmount,
  onMaxClick,
}: Props) {
  const { t } = useTranslation();
  const hasError = isInsufficient || isBelowMin;

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
        {t('wallet.withdrawAmount')}
      </p>
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 transition-colors',
          hasError ? 'border-red-500/50' : 'border-border',
          disabled && 'opacity-70',
        )}
      >
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('wallet.withdrawAmountPlaceholder', { amount: '10' })}
          disabled={disabled}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
        />
        {!disabled && (
          <button
            type="button"
            onClick={onMaxClick}
            className="text-xs font-semibold text-primary hover:text-primary/80"
          >
            {t('wallet.transferAll')}
          </button>
        )}
      </div>
      {isInsufficient ? (
        <p className="flex items-center gap-1 text-[10px] font-semibold text-red-400 leading-tight">
          <AlertTriangle className="size-3 shrink-0" />
          {t('wallet.withdrawInsufficientBalanceDesc', {
            unit: walletUnit,
            available: `${formatBalance(walletBalance)} ${walletUnit}`,
          })}
        </p>
      ) : isBelowMin ? (
        <p className="flex items-center gap-1 text-[10px] font-semibold text-red-400 leading-tight">
          <AlertTriangle className="size-3 shrink-0" />
          {t('wallet.withdrawMinAmountDesc', { min: minAmount, unit: walletUnit })}
        </p>
      ) : null}
    </div>
  );
}
