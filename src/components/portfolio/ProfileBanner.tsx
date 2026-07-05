import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { DASHBOARD_RANKS } from '@/lib/dashboard.constants';
import { RANK_VISUALS, FALLBACK_RANK_VISUAL } from '@/components/dashboard/ReferralCard';
import { useAuthStore, type AuthUser } from '@/stores/auth.store';

interface Props {
  user: AuthUser | null;
}

/**
 * Portfolio profile banner — uses the same TIER hero pattern as the dashboard
 * ReferralCard's rank tile (text-left column + illustration-right column with
 * radial neon halo). Wallet-address copy row sits below as the unique extra.
 *
 * Single source of truth: RANK_VISUALS lives in ReferralCard.tsx.
 */
export function ProfileBanner({ user }: Props) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  // Prefer live `profile.rank` over login-cached `user.rank` so rank changes
  // reflect without forcing logout+login.
  const profileRank = useAuthStore((s) => s.profile?.rank);
  const isInactive = useAuthStore((s) => s.profile?.isQualified === false);

  const rankKey = profileRank ?? user?.rank;
  const currentRank =
    DASHBOARD_RANKS.find((r) => r.key === rankKey) ?? DASHBOARD_RANKS[0];
  const visual = RANK_VISUALS[currentRank.key] ?? FALLBACK_RANK_VISUAL;

  function copyAddress() {
    if (!user?.walletAddress) return;
    navigator.clipboard.writeText(user.walletAddress).then(() => {
      setCopied(true);
      toast.success(t('portfolio.addressCopied'));
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Card className="card-operator">
      <CardContent className="flex flex-col gap-4 p-5 sm:p-6">

        {/* ── Rank hero banner — text-left / image-right (dashboard pattern) ── */}
        <section
          className="relative overflow-hidden rounded-2xl border border-border"
          style={{
            background: `
              linear-gradient(90deg,
                rgba(8, 10, 14, 0.78) 0%,
                rgba(8, 10, 14, 0.55) 55%,
                rgba(8, 10, 14, 0.15) 100%),
              linear-gradient(140deg,
                color-mix(in oklab, ${visual.accent} 18%, transparent) 0%,
                color-mix(in oklab, ${visual.accent} 24%, transparent) 45%,
                color-mix(in oklab, ${visual.accent} 35%, transparent) 100%)`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px color-mix(in oklab, ${visual.accent} 25%, transparent), 0 0 32px -10px color-mix(in oklab, ${visual.accent} 55%, transparent)`,
          }}
        >
          <div className="relative grid grid-cols-[1fr_auto] items-center gap-2 px-5 py-5">

            {/* LEFT — text column */}
            <div className="flex flex-col gap-3 min-w-0">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.22em]"
                style={{ color: visual.accent, textShadow: '0 1px 2px rgba(0,0,0,0.65)' }}
              >
                {t('portfolio.currentRank')}
              </p>
              <h3
                className="text-xl font-extrabold tracking-tight text-white leading-none"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
              >
                {t(currentRank.nameKey)}
              </h3>

              <div className="flex flex-wrap items-center gap-1.5">
                {isInactive ? (
                  <StatusBadge variant="danger">{t('dashboard.inactive')}</StatusBadge>
                ) : (
                  <StatusBadge variant="success" animated>
                    {t('dashboard.active')}
                  </StatusBadge>
                )}
                <span
                  className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wider"
                  style={{
                    borderColor: `color-mix(in oklab, ${visual.accent} 60%, transparent)`,
                    background: `color-mix(in oklab, ${visual.accent} 22%, rgba(0,0,0,0.4))`,
                    color: '#fff',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {currentRank.quotaBonus}
                </span>
                <span className="inline-flex items-center rounded-full border border-white/20 bg-black/40 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-white font-mono">
                  Max {currentRank.bonusExample}
                </span>
              </div>
            </div>

            {/* RIGHT — rank illustration (crown for Gold Leader, etc.) */}
            <img
              src={visual.image}
              alt=""
              aria-hidden
              draggable={false}
              className="pointer-events-none select-none w-[110px] sm:w-[120px] h-auto object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.45)]"
            />
          </div>
        </section>

        {/* ── Wallet address copy field (portfolio-unique) ── */}
        <div
          className="rounded-2xl border px-4 py-3"
          style={{
            borderColor: `color-mix(in oklab, ${visual.accent} 22%, var(--border))`,
            background: `color-mix(in oklab, ${visual.accent} 4%, var(--card))`,
          }}
        >
          <p className="eyebrow mb-1.5" style={{ color: visual.accent }}>
            {t('portfolio.walletAddress')}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-mono text-foreground flex-1 truncate tracking-tight">
              {user?.walletAddress ?? '—'}
            </p>
            <button
              onClick={copyAddress}
              className="shrink-0 rounded-md p-1.5 transition-colors hover:bg-white/10"
              aria-label={t('portfolio.copy')}
            >
              {copied
                ? <Check className="size-3.5 text-[color:var(--success)]" />
                : <Copy className="size-3.5 text-muted-foreground" />
              }
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
