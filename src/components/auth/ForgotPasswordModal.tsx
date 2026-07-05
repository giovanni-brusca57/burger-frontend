import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import { forgotPassword, resetPassword } from '@/lib/auth';
import { useAuthModalStore } from '@/stores/auth-modal.store';
import { useAuthStore } from '@/stores/auth.store';

import { AuthErrorBanner, PasswordInput, extractError } from './auth-shared';
import { AuthLayout } from './AuthLayout';

export function ForgotPasswordModal() {
  const { t } = useTranslation();
  const { showLogin, hide, prefillEmail } = useAuthModalStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [fpStep, setFpStep] = useState<1 | 2>(1);
  // Seed from `prefillEmail` so the Profile → "Change / Forgot Password" entry
  // point doesn't force the user to retype their own email.
  const [fpEmail, setFpEmail] = useState(prefillEmail ?? '');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPw, setFpNewPw] = useState('');
  const [fpConfirmPw, setFpConfirmPw] = useState('');
  const [showFpPw, setShowFpPw] = useState(false);
  const [showFpConfirm, setShowFpConfirm] = useState(false);
  const [fpResendCountdown, setFpResendCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (fpResendCountdown <= 0) return;
    const id = setTimeout(
      () => setFpResendCountdown((prev) => (prev <= 1 ? 0 : prev - 1)),
      1000
    );
    return () => clearTimeout(id);
  }, [fpResendCountdown]);

  const resetError = useCallback(() => setError(''), []);

  const handleForgotPassword = useCallback(
    async (e: { preventDefault(): void }) => {
      e.preventDefault();
      resetError();
      setLoading(true);
      try {
        await forgotPassword(fpEmail);
        setFpStep(2);
        setFpResendCountdown(60);
      } catch (err: unknown) {
        setError(extractError(err, t('auth.resetError')));
      } finally {
        setLoading(false);
      }
    },
    [fpEmail, t, resetError]
  );

  const handleResetPassword = useCallback(
    async (e: { preventDefault(): void }) => {
      e.preventDefault();
      resetError();
      if (fpNewPw !== fpConfirmPw) {
        setError(t('auth.passwordMismatch'));
        return;
      }
      setLoading(true);
      try {
        await resetPassword({ email: fpEmail, otpCode: fpOtp, newPassword: fpNewPw });
        toast.success(t('auth.resetSuccess'));
        setFpStep(1);
        setFpEmail(''); setFpOtp(''); setFpNewPw(''); setFpConfirmPw('');
        setFpResendCountdown(0);
        // Authenticated users (coming from Profile → "Change / Forgot Password")
        // just dismiss the modal; logged-out users get routed back to login so
        // they can sign in with the new password.
        if (isAuthenticated) hide();
        else showLogin();
      } catch (err: unknown) {
        setError(extractError(err, t('auth.resetError')));
      } finally {
        setLoading(false);
      }
    },
    [fpEmail, fpOtp, fpNewPw, fpConfirmPw, showLogin, hide, isAuthenticated, t, resetError]
  );

  const handleFpResendOtp = useCallback(async () => {
    if (fpResendCountdown > 0) return;
    resetError();
    setLoading(true);
    try {
      await forgotPassword(fpEmail);
      setFpResendCountdown(60);
    } catch (err: unknown) {
      setError(extractError(err, t('auth.resetError')));
    } finally {
      setLoading(false);
    }
  }, [fpResendCountdown, fpEmail, t, resetError]);

  return (
    <AuthLayout>
      {/* ── Step 1: Enter email ── */}
      {fpStep === 1 && (
        <>
          <div className="mb-7">
            <h2 className="text-2xl font-bold tracking-tight">{t('auth.resetPasswordTitle')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('auth.resetPasswordSubtitle')}</p>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fp-email">{t('auth.email')}</Label>
              <Input
                id="fp-email"
                type="email"
                placeholder="you@example.com"
                value={fpEmail}
                onChange={(e) => setFpEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                className="h-11"
              />
            </div>

            <AuthErrorBanner error={error} />

            <Button
              type="submit"
              className="min-w-[96%] h-11 gap-1.5 rounded-full text-sm font-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t('auth.sendingOtp')}
                </>
              ) : (
                <>
                  <Mail className="size-4" />
                  {t('auth.sendResetCode')}
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground pt-1">
              <button
                type="button"
                onClick={() => { resetError(); showLogin(); }}
                className="font-medium text-primary hover:underline"
              >
                {t('auth.backToLogin')}
              </button>
            </p>
          </form>
        </>
      )}

      {/* ── Step 2: OTP + new password ── */}
      {fpStep === 2 && (
        <>
          <div className="mb-7">
            <h2 className="text-2xl font-bold tracking-tight">{t('auth.resetPassword')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('auth.otpSent', { email: fpEmail })}</p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="rounded-lg bg-muted/30 border border-border/50 px-4 py-3 flex items-start gap-2.5">
              <Mail className="size-4 shrink-0 mt-0.5 text-primary" />
              <p className="text-sm text-muted-foreground">
                Check your email for the reset code.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fp-otp">{t('auth.otpCode')}</Label>
              <Input
                id="fp-otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder={t('auth.otpPlaceholder')}
                value={fpOtp}
                onChange={(e) => setFpOtp(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
                autoComplete="one-time-code"
                className="h-11 text-center tracking-[0.5em] font-mono text-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fp-new-pw">{t('auth.newPassword')}</Label>
              <PasswordInput
                id="fp-new-pw"
                value={fpNewPw}
                onChange={(e) => setFpNewPw(e.target.value)}
                show={showFpPw}
                onToggle={() => setShowFpPw((v) => !v)}
                ariaLabel={showFpPw ? t('auth.hidePassword') : t('auth.showPassword')}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fp-confirm-pw">{t('auth.confirmPassword')}</Label>
              <PasswordInput
                id="fp-confirm-pw"
                value={fpConfirmPw}
                onChange={(e) => setFpConfirmPw(e.target.value)}
                show={showFpConfirm}
                onToggle={() => setShowFpConfirm((v) => !v)}
                ariaLabel={showFpConfirm ? t('auth.hidePassword') : t('auth.showPassword')}
                autoComplete="new-password"
              />
            </div>

            <AuthErrorBanner error={error} />

            <Button
              type="submit"
              className="min-w-[90%] h-11 gap-1.5 rounded-full text-sm font-semibold"
              disabled={loading || fpOtp.length !== 6 || !fpNewPw || !fpConfirmPw}
            >
              {loading ? (
                <>
                  <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t('auth.resettingPassword')}
                </>
              ) : (
                <>
                  <KeyRound className="size-4" />
                  {t('auth.resetPassword')}
                </>
              )}
            </Button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setFpStep(1); setFpOtp(''); setFpNewPw(''); setFpConfirmPw('');
                  setFpResendCountdown(0); resetError();
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('auth.backToDetails')}
              </button>
              <button
                type="button"
                onClick={handleFpResendOtp}
                disabled={fpResendCountdown > 0 || loading}
                className={cn(
                  'font-medium transition-colors',
                  fpResendCountdown > 0 || loading
                    ? 'text-muted-foreground cursor-not-allowed'
                    : 'text-primary hover:underline'
                )}
              >
                {fpResendCountdown > 0
                  ? t('auth.resendCodeCountdown', { seconds: fpResendCountdown })
                  : t('auth.resendCode')}
              </button>
            </div>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
