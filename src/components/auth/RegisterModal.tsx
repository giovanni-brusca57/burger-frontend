import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import { register, sendOtp } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth.store';
import { useAuthModalStore } from '@/stores/auth-modal.store';

import { AuthErrorBanner, PasswordInput, extractError } from './auth-shared';
import { AuthLayout } from './AuthLayout';

export function RegisterModal() {
  const { t } = useTranslation();
  const { prefillRef, hide, showLogin } = useAuthModalStore();
  const { setAuth } = useAuthStore();

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirm_password: '',
    referral_address: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [otpWarning, setOtpWarning] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill referral from URL param
  useEffect(() => {
    if (prefillRef) {
      setForm((prev) => ({ ...prev, referral_address: prefillRef }));
    }
  }, [prefillRef]);

  // Countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const id = setTimeout(
      () => setResendCountdown((p) => (p <= 1 ? 0 : p - 1)),
      1000
    );
    return () => clearTimeout(id);
  }, [resendCountdown]);

  const resetError = useCallback(() => setError(''), []);

  const setField = useCallback(
    (field: keyof typeof form) =>
      (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value })),
    []
  );

  const handleSendOtp = useCallback(async () => {
    if (resendCountdown > 0 || sendingOtp) return;

    if (!form.email || !form.password || !form.confirm_password) {
      setOtpWarning(t('auth.fillFormFirst'));
      return;
    }
    if (form.password !== form.confirm_password) {
      setOtpWarning(t('auth.passwordMismatch'));
      return;
    }

    setOtpWarning('');
    resetError();
    setSendingOtp(true);
    try {
      await sendOtp(form.email);
      setOtpSent(true);
      setResendCountdown(300); // 5-minute cooldown
    } catch (err: unknown) {
      // BE returns 409 ConflictException when the email is already registered.
      // Surface a specific message that points the user at login / forgot-password
      // instead of the generic "register failed" copy.
      const e = err as { status?: number; message?: string };
      if (e?.status === 409) {
        setError(t('auth.registerEmailExists'));
      } else {
        setError(extractError(err, t('auth.registerError')));
      }
    } finally {
      setSendingOtp(false);
    }
  }, [form.email, form.password, form.confirm_password, resendCountdown, sendingOtp, t, resetError]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      resetError();

      if (form.password !== form.confirm_password) {
        setError(t('auth.passwordMismatch'));
        return;
      }
      if (!form.referral_address.trim()) {
        setError(t('auth.referralAddressRequired'));
        return;
      }
      if (!otpSent) {
        setOtpWarning(t('auth.otpRequestFirst'));
        return;
      }
      if (otpCode.length !== 6) {
        setOtpWarning(t('auth.otpIncomplete', { email: form.email }));
        return;
      }

      setLoading(true);
      try {
        const res = await register({
          email: form.email,
          password: form.password,
          confirm_password: form.confirm_password,
          otpCode,
          referral_address: form.referral_address.trim(),
        });
        setAuth({
          accessToken: res.access_token,
          userId: res.id,
          email: form.email,
          walletAddress: res.wallet_address,
          rank: res.rank,
        });
        setForm({ email: '', password: '', confirm_password: '', referral_address: '' });
        setOtpCode('');
        setOtpSent(false);
        setResendCountdown(0);
        hide();
      } catch (err: unknown) {
        setError(extractError(err, t('auth.registerError')));
      } finally {
        setLoading(false);
      }
    },
    [form, otpCode, otpSent, hide, setAuth, t, resetError]
  );

  return (
    <AuthLayout>
      <div className="mb-7">
        <h2 className="text-2xl font-bold tracking-tight">{t('auth.createAccount')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('auth.registerSubtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="reg-email">{t('auth.email')}</Label>
          <Input
            id="reg-email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={setField('email')}
            required
            autoComplete="email"
            className="h-11"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="reg-password">{t('auth.password')}</Label>
          <PasswordInput
            id="reg-password"
            value={form.password}
            onChange={setField('password')}
            show={showPw}
            onToggle={() => setShowPw((v) => !v)}
            ariaLabel={showPw ? t('auth.hidePassword') : t('auth.showPassword')}
            autoComplete="new-password"
          />
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <Label htmlFor="reg-confirm">{t('auth.confirmPassword')}</Label>
          <PasswordInput
            id="reg-confirm"
            value={form.confirm_password}
            onChange={setField('confirm_password')}
            show={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            ariaLabel={showConfirm ? t('auth.hidePassword') : t('auth.showPassword')}
            autoComplete="new-password"
          />
        </div>

        {/* Referral Address — required */}
        <div className="space-y-1.5">
          <Label htmlFor="reg-referral">{t('auth.referralAddress')}</Label>
          <Input
            id="reg-referral"
            type="text"
            placeholder="0x..."
            value={form.referral_address}
            onChange={setField('referral_address')}
            required
            autoComplete="off"
            className="h-11"
          />
          <p className="text-[11px] text-muted-foreground">{t('auth.referralAddressHint')}</p>
        </div>

        {/* OTP Code — inline with Send Code button */}
        <div className="space-y-1.5">
          <Label htmlFor="reg-otp">{t('auth.otpCode')}</Label>
          <div className="flex gap-2">
            <Input
              id="reg-otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder={t('auth.otpPlaceholder')}
              value={otpCode}
              onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '')); setOtpWarning(''); }}
              autoComplete="one-time-code"
              className="h-11 text-center tracking-[0.4em] font-mono"
            />
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={sendingOtp || resendCountdown > 0}
              className={cn(
                'shrink-0 min-w-[72px] rounded-lg px-3 text-xs font-semibold border transition-colors whitespace-nowrap h-11',
                resendCountdown > 0 || sendingOtp
                  ? 'border-border text-muted-foreground cursor-not-allowed bg-muted/30'
                  : 'border-primary/40 text-primary hover:bg-primary/10'
              )}
            >
              {sendingOtp ? (
                <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" />
              ) : resendCountdown > 0 ? (
                `${resendCountdown}s`
              ) : otpSent ? (
                t('auth.resendCode')
              ) : (
                t('auth.sendCode')
              )}
            </button>
          </div>
          {otpWarning && (
            <p className="text-[11px] text-amber-400 flex items-center gap-1">
              <span>⚠</span> {otpWarning}
            </p>
          )}
          {!otpWarning && otpSent && (
            <p className="text-[11px] text-muted-foreground">
              {t('auth.otpSent', { email: form.email })}
            </p>
          )}
        </div>

        <AuthErrorBanner error={error} />

        <Button
          type="submit"
          className="min-w-[92%] h-11 gap-1.5 rounded-full text-sm font-semibold"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t('auth.creatingAccount')}
            </>
          ) : (
            <>
              <UserPlus className="size-4" />
              {t('auth.verifyAndCreate')}
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground pt-1">
          {t('auth.haveAccount')}{' '}
          <button
            type="button"
            onClick={showLogin}
            className="font-medium text-primary hover:underline"
          >
            {t('auth.login')}
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
