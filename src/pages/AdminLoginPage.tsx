import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminLogin } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth.store';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { setAuth, updateUser, refreshProfile, isAuthenticated } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { profile } = useAuthStore();

  // If already logged in as admin (profile confirms it), redirect
  useEffect(() => {
    if (isAuthenticated && profile?.role === 'ADMIN') {
      navigate('/control-panel', { replace: true });
    }
  }, [isAuthenticated, profile, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await adminLogin({ email, password });

      // Fast-path: if BE already returns role=ADMIN in login response, use it
      // to skip an extra round-trip for obvious non-admins.
      if (res.role && res.role !== 'ADMIN') {
        setError('Access denied. This account does not have admin privileges.');
        return;
      }

      // Store credentials — role is intentionally NOT stored here.
      // Role is authoritative only from profile (server-verified GET /auth/profile).
      setAuth({
        accessToken: res.access_token,
        userId: res.id,
        email,
        walletAddress: res.wallet_address,
        rank: res.rank,
      });

      // Fetch profile once — populates store AND gives us role to verify.
      // refreshProfile() sets store.profile; read it via getState() after await.
      try {
        await refreshProfile();
      } catch {
        useAuthStore.getState().logout();
        setError('Could not verify account permissions. Please try again.');
        return;
      }

      const verifiedProfile = useAuthStore.getState().profile;
      if (!verifiedProfile || verifiedProfile.role !== 'ADMIN') {
        useAuthStore.getState().logout();
        setError('Access denied. This account does not have admin privileges.');
        return;
      }

      updateUser({ email: verifiedProfile.email });
      toast.success('Admin login successful');
      navigate('/control-panel', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-dvh flex items-center justify-center bg-background p-4 overflow-hidden">
      {/* Ambient red halo backdrop */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 55% 45% at 50% 40%, color-mix(in oklab, var(--destructive) 14%, transparent), transparent 70%)',
        }}
      />

      <div className="w-full max-w-sm space-y-7">
        {/* Header — Dashboard pattern */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div
            className="flex size-14 items-center justify-center rounded-2xl border text-[color:var(--destructive)]"
            style={{
              borderColor: 'color-mix(in oklab, var(--destructive) 55%, var(--border))',
              background: 'color-mix(in oklab, var(--destructive) 14%, transparent)',
              boxShadow: '0 0 24px -8px color-mix(in oklab, var(--destructive) 55%, transparent)',
            }}
          >
            <ShieldCheck className="size-7" />
          </div>
          <div className="flex flex-col gap-2 items-center">
            <p className="eyebrow text-[color:var(--destructive)]">// RESTRICTED ACCESS</p>
            <h1 className="text-3xl font-bold tracking-tighter leading-none">
              Admin Console
            </h1>
            <p className="editorial-quote text-base mt-1 max-w-xs">
              &ldquo;Levers, dials, kill switches &mdash; authorized personnel only.&rdquo;
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-[color:color-mix(in_oklab,var(--destructive)_30%,var(--border))] bg-[color:color-mix(in_oklab,var(--destructive)_4%,var(--card))] p-5" style={{ boxShadow: 'inset 0 1px 0 color-mix(in oklab, var(--destructive) 14%, transparent), 0 0 28px -14px color-mix(in oklab, var(--destructive) 50%, transparent)' }}>
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-xs text-red-400">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="admin-email" className="text-xs">Admin Email</Label>
            <Input
              id="admin-email"
              type="email"
              required
              autoComplete="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-password" className="text-xs">Password</Label>
            <div className="relative">
              <Input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !email || !password}
            className="min-w-[90%] bg-[color:var(--destructive)] hover:bg-[color:var(--destructive)]/90 text-white font-bold border-[color:var(--destructive)] shadow-[3px_3px_0_0_color-mix(in_oklab,var(--destructive)_60%,transparent)]"
          >
            {loading ? 'Authenticating...' : 'Login to Control Panel'}
          </Button>

          <p className="text-[10px] text-center text-muted-foreground/60 leading-relaxed pt-2">
            This page is for administrators only. Regular users cannot login here.
            <br />
            All login attempts are logged and monitored.
          </p>
        </form>

        <div className="flex items-center justify-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            ← Back to user login
          </button>
        </div>
      </div>
    </div>
  );
}
