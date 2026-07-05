import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (next: string) => void;
  /** Locked once the OTP has been requested — input becomes read-only and "Use saved" hides. */
  disabled: boolean;
  /** Pre-saved BEP20 address from the user's profile, if any. */
  savedAddress?: string;
  /** Click "Use saved" → fill the input with the saved profile address. */
  onUseSaved: () => void;
  /** Whether `value` passes the BEP20 0x[40 hex] regex. */
  isAddressValid: boolean;
}

/** BEP20 withdrawal-address input + valid/invalid hint + "Use saved" shortcut. */
export function WithdrawAddressField({
  value,
  onChange,
  disabled,
  savedAddress,
  onUseSaved,
  isAddressValid,
}: Props) {
  const { t } = useTranslation();
  const showUseSaved = !disabled && savedAddress && value !== savedAddress;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            {t('wallet.withdrawAddress')}
          </p>
          <p className="text-[9px] text-muted-foreground/60 leading-tight">
            {t('wallet.withdrawYourBep20')}
          </p>
        </div>
        {showUseSaved && (
          <button
            type="button"
            onClick={onUseSaved}
            className="text-[10px] text-primary hover:underline shrink-0"
          >
            {t('wallet.withdrawUseSaved')}
          </button>
        )}
      </div>
      <div
        className={cn(
          'rounded-lg border bg-muted/30 px-3 py-2.5 transition-colors',
          value.length === 0
            ? 'border-border'
            : isAddressValid
              ? 'border-emerald-500/40'
              : 'border-red-500/40',
          disabled && 'opacity-70',
        )}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0x... (BEP20/BSC withdrawal address)"
          disabled={disabled}
          className="w-full bg-transparent text-xs font-mono outline-none placeholder:text-muted-foreground/60 text-foreground/90 disabled:cursor-not-allowed"
          spellCheck={false}
          autoComplete="off"
        />
      </div>
      <p
        className={cn(
          'text-[10px] leading-tight',
          value.length === 0
            ? 'text-muted-foreground/60'
            : isAddressValid
              ? 'text-emerald-400'
              : 'text-red-400',
        )}
      >
        {value.length === 0
          ? t('wallet.withdrawEnterAddress')
          : isAddressValid
            ? t('wallet.withdrawValidAddress')
            : t('wallet.withdrawInvalidAddress')}
      </p>
    </div>
  );
}
