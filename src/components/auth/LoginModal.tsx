import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CircleUser } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { login, getProfile } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth.store';
import { useAuthModalStore } from '@/stores/auth-modal.store';

import { AuthErrorBanner, PasswordInput, extractError } from './auth-shared';
import { AuthLayout } from './AuthLayout';

export function LoginModal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hide, showLogin, showRegister, showForgotPassword } = useAuthModalStore();
  const { setAuth, updateUser } = useAuthStore();

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetError = useCallback(() => setError(''), []);

  const setLogin = useCallback(
    (field: keyof typeof loginForm) =>
      (e: React.ChangeEvent<HTMLInputElement>) =>
        setLoginForm((prev) => ({ ...prev, [field]: e.target.value })),
    []
  );

  const handleSwitch = (to: 'login' | 'register' | 'forgot-password') => {
    resetError();
    if (to === 'login') showLogin();
    else if (to === 'register') showRegister();
    else showForgotPassword();
  };

  const handleLogin = useCallback(async (e: { preventDefault(): void }) => {
    e.preventDefault();
    resetError();
    setLoading(true);
    try {
      const res = await login({
        email: loginForm.email,
        password: loginForm.password,
      });
      setAuth({
        accessToken: res.access_token,
        userId: res.id,
        email: loginForm.email,
        walletAddress: res.wallet_address,
        rank: res.rank,
      });
      getProfile()
        .then((profile) => updateUser({ email: profile.email }))
        .catch(() => {});
      setLoginForm({ email: '', password: '' });
      hide();
      toast.success(t('auth.loginSuccess'), {
        description: t('auth.loginSuccessDesc'),
        duration: 4000,
      });
    } catch (err: unknown) {
      setError(extractError(err, t('auth.loginError')));
    } finally {
      setLoading(false);
    }
  }, [loginForm.email, loginForm.password, hide, setAuth, updateUser, showLogin, t, resetError, navigate]);

  return (
    <AuthLayout>
      <div className="mb-7">
        <h2 className="text-2xl font-bold tracking-tight">{t('auth.welcomeBack')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('auth.loginSubtitle')}</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="login-email">{t('auth.email')}</Label>
          <Input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            value={loginForm.email}
            onChange={setLogin('email')}
            required
            autoComplete="email"
            className="h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="login-password">{t('auth.password')}</Label>
          <PasswordInput
            id="login-password"
            value={loginForm.password}
            onChange={setLogin('password')}
            show={showLoginPw}
            onToggle={() => setShowLoginPw((v) => !v)}
            ariaLabel={showLoginPw ? t('auth.hidePassword') : t('auth.showPassword')}
            autoComplete="current-password"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => handleSwitch('forgot-password')}
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            {t('auth.forgotPassword')}
          </button>
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
              {t('auth.loggingIn')}
            </>
          ) : (
            <>
              <CircleUser className="size-4" />
              {t('auth.login')}
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground pt-1">
          {t('auth.noAccount')}{' '}
          <button
            type="button"
            onClick={() => handleSwitch('register')}
            className="font-medium text-primary hover:underline"
          >
            {t('auth.register')}
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
