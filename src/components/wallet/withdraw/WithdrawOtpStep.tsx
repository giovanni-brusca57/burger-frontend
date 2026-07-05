import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatRemaining } from '@/lib/withdraw-intent';

interface Props {
  /** 6-digit OTP code currently in the input. */
  otpCode: string;
  onOtpChange: (next: string) => void;
  /** Seconds left on the active OTP — drives the "expires in" badge. */
  expirySec: number;
  /** Seconds left on the resend cooldown — drives the resend button label/disabled state. */
  cooldownSec: number;
  /** True while a request-otp / resend-otp call is in flight. */
  requestingOtp: boolean;
  onResend: () => void;
}

/** OTP entry step for USDT auto-withdraw — input + expiry countdown + resend control. */
export function WithdrawOtpStep({
  otpCode,
  onOtpChange,
  expirySec,
  cooldownSec,
  requestingOtp,
  onResend,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
          {t('wallet.withdrawOtpLabel')}
        </p>
        {expirySec > 0 && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[10px] font-semibold tabular-nums',
              expirySec < 60 ? 'text-amber-400' : 'text-muted-foreground',
            )}
          >
            <Clock className="size-2.5" />
            {t('wallet.withdrawCodeExpiresIn', { time: formatRemaining(expirySec) })}
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">{t('wallet.withdrawOtpHint')}</p>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={otpCode}
        onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-center text-lg font-mono tracking-[0.4em] outline-none focus:border-primary"
      />
      <button
        type="button"
        disabled={cooldownSec > 0 || requestingOtp}
        onClick={onResend}
        className="text-[11px] font-semibold text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {cooldownSec > 0
          ? t('wallet.withdrawResendCodeCountdown', { seconds: cooldownSec })
          : t('wallet.withdrawResendCode')}
      </button>
    </div>
  );
}
