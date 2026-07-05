import { useTranslation } from 'react-i18next';
import { Copy, Check, Link2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, type StatusBadgeVariant } from '@/components/dashboard/StatusBadge';
import { DASHBOARD_RANKS } from '@/lib/dashboard.constants';
import { formatBalance } from '@/lib/helpers';
import { useDirectNetworkStats } from '@/hooks/useDirectNetworkStats';
import type { AuthUser } from '@/stores/auth.store';
import type { UserProfile } from '@/types/auth.types';

interface Props {
  user: AuthUser | null;
  isAuthenticated: boolean;
  profile: UserProfile | null;
  referralLink: string;
  copied: boolean;
  onCopy: () => void;
}

/**
 * Per-rank visual identity: image, banner gradient, accent color,
 * pill variant. Single source of truth — adding a tier later means
 * one entry here, nothing else.
 */
export const RANK_VISUALS: Record<
  string,
  { image: string; gradient: string; accent: string; variant: StatusBadgeVariant }
> = {
  MEMBERSHIP: {
    image: '/rank-membership.svg',
    gradient:
      'bg-[linear-gradient(140deg,rgba(251,165,110,0.18)_0%,rgba(205,127,50,0.24)_45%,rgba(91,42,15,0.34)_100%)]',
    accent: 'oklch(0.72 0.14 50)',
    variant: 'primary',
  },
  LEADER: {
    image: '/rank-leader.svg',
    gradient:
      'bg-[linear-gradient(140deg,rgba(248,250,252,0.16)_0%,rgba(203,213,225,0.22)_45%,rgba(71,85,105,0.34)_100%)]',
    accent: 'oklch(0.84 0.02 250)',
    variant: 'info',
  },
  GOLD_LEADER: {
    image: '/rank-gold-leader.svg',
    gradient:
      'bg-[linear-gradient(140deg,rgba(252,211,77,0.22)_0%,rgba(245,158,11,0.28)_45%,rgba(120,53,15,0.38)_100%)]',
    accent: 'oklch(0.86 0.18 80)',
    variant: 'primary',
  },
  DIAMOND_LEADER: {
    image: '/rank-diamond-leader.svg',
    gradient:
      'bg-[linear-gradient(140deg,rgba(103,232,249,0.20)_0%,rgba(34,211,238,0.26)_45%,rgba(14,116,144,0.36)_100%)]',
    accent: 'oklch(0.85 0.18 200)',
    variant: 'primary',
  },
};

export const FALLBACK_RANK_VISUAL = RANK_VISUALS.MEMBERSHIP;

export function ReferralCard({ user, isAuthenticated, profile, referralLink, copied, onCopy }: Props) {
  const { t } = useTranslation();
  const stats = useDirectNetworkStats();

  // Prefer live profile rank over login-cached user rank.
  const rankKey = profile?.rank ?? user?.rank;
  const currentRank =
    isAuthenticated && rankKey ? DASHBOARD_RANKS.find((r) => r.key === rankKey) : null;
  const visual = (currentRank && RANK_VISUALS[currentRank.key]) ?? FALLBACK_RANK_VISUAL;
  const isInactive = profile?.isQualified === false;

  return (
    <Card className="card-operator">
      <CardContent className="flex flex-col gap-5 p-5 sm:p-6">

        {/* ── Identity strip ────────────────────────────────────────────── */}
        <header className="flex items-center justify-between gap-2">
          <div className="flex size-9 items-center justify-center rounded-full border border-border text-primary">
            <Link2 className="size-4" />
          </div>
          {currentRank && (
            <StatusBadge variant={isInactive ? 'danger' : visual.variant}>
              {t(currentRank.nameKey)}
            </StatusBadge>
          )}
        </header>

        {/* ── Rank hero banner — text-left column / image-right column.
              No more full-bleed image under text; each side has clean
              real estate. Background uses a darker rank-tinted gradient
              ONLY on the text side so labels stay readable. ────────────── */}
        {currentRank ? (
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

              {/* LEFT — text column (dark scrim above ensures contrast) */}
              <div className="flex flex-col gap-3 min-w-0">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.22em]"
                  style={{ color: visual.accent, textShadow: '0 1px 2px rgba(0,0,0,0.65)' }}
                >
                  Tier
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

                {isInactive && (
                  <p
                    className="text-xs text-[#FCA5A5] leading-tight max-w-[22ch]"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                  >
                    {t('dashboard.investMinToActivate')}
                  </p>
                )}
              </div>

              {/* RIGHT — illustration in its own column, no text overlap */}
              <img
                src={visual.image}
                alt=""
                aria-hidden
                draggable={false}
                className="pointer-events-none select-none w-[110px] sm:w-[120px] h-auto object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.45)]"
              />
            </div>
          </section>
        ) : null}

        {/* ── Stat grid: 2 tiles, accent top-rule per stat ──────────────── */}
        {isAuthenticated && (
          <dl className="grid grid-cols-2 gap-3">
            <div className="relative rounded-2xl border border-border bg-card px-3 py-3 text-center overflow-hidden transition-transform duration-150 ease-out active:scale-[0.98]">
              <span
                className="absolute inset-x-3 top-0 h-[2px] rounded-b-full"
                style={{ background: visual.accent, opacity: 0.55 }}
              />
              <dt className="eyebrow">{t('dashboard.directMembers')}</dt>
              <dd className="metric-figure text-2xl text-foreground mt-1.5">
                {profile?.totalDirectDownline ?? '—'}
              </dd>
              <p className="mt-1 text-[10px] text-muted-foreground/70 leading-tight">
                {t('dashboard.directDownlines')}
              </p>
            </div>
            <div className="relative rounded-2xl border border-border bg-card px-3 py-3 text-center overflow-hidden transition-transform duration-150 ease-out active:scale-[0.98]">
              <span
                className="absolute inset-x-3 top-0 h-[2px] rounded-b-full"
                style={{ background: 'var(--success)', opacity: 0.55 }}
              />
              <dt className="eyebrow">{t('dashboard.activeTrading')}</dt>
              {/* metric-figure with neon-sweep rainbow — 8 hues cycle
                  through the number (rose → orange → yellow → lime → mint
                  → cyan → blue → violet → back to rose, seamless). */}
              <dd className="metric-figure neon-sweep-rainbow text-2xl mt-1.5 tabular-nums">
                {stats ? `$${formatBalance(stats.activeTradingTotal)}` : '—'}
              </dd>
              <p className="mt-1 text-[10px] text-muted-foreground/70 leading-tight">
                {t('dashboard.tradingWalletTotal')}
              </p>
            </div>
          </dl>
        )}

        {/* ── Divider ───────────────────────────────────────────────────── */}
        <div className="divider-soft" />

        {/* ── Referral link block ───────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <p className="eyebrow">// REFERRAL</p>
            <p className="text-base font-bold text-foreground">{t('dashboard.referralLink')}</p>
            <p className="text-xs text-muted-foreground leading-snug">
              {t('dashboard.shareReferralLink')}
            </p>
          </div>

          {isAuthenticated && referralLink ? (
            <>
              <div className="flex items-center gap-2 rounded-full border border-border surface-soft pl-3 pr-1.5 py-1.5">
                <span className="flex-1 truncate text-xs text-muted-foreground font-mono">
                  {user?.walletAddress?.slice(0, 10)}...{user?.walletAddress?.slice(-6)}
                </span>
                <button
                  onClick={onCopy}
                  className="shrink-0 rounded-full p-1.5 transition-colors hover:bg-primary/20"
                  aria-label={t('dashboard.copyLink')}
                >
                  {copied
                    ? <Check className="size-3.5 text-[color:var(--success)]" />
                    : <Copy className="size-3.5 text-muted-foreground" />}
                </button>
              </div>
              <Button variant="outline" size="sm" className="min-w-[94%]" onClick={onCopy}>
                {copied ? (
                  <>
                    <Check className="size-3.5 mr-1.5" />
                    {t('dashboard.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5 mr-1.5" />
                    {t('dashboard.copyLink')}
                  </>
                )}
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic">{t('dashboard.loginToGetLink')}</p>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
