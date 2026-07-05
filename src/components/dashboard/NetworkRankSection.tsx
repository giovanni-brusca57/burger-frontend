import { useTranslation } from 'react-i18next';
import { Network, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { SectionTitle } from '@/components/dashboard/SectionTitle';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { DASHBOARD_RANKS } from '@/lib/dashboard.constants';
import { useDirectNetworkStats, type DirectNetworkStats } from '@/hooks/useDirectNetworkStats';
import type { AuthUser } from '@/stores/auth.store';
import type { UserProfile } from '@/types/auth.types';

interface Props {
  user: AuthUser | null;
  isAuthenticated: boolean;
  profile: UserProfile | null;
}

const RANK_COUNTS: { key: string; statsKey: keyof DirectNetworkStats; neon: string; image: string }[] = [
  { key: 'MEMBERSHIP',     statsKey: 'membershipCount',     neon: 'neon-membership', image: '/rank-membership.svg'    },
  { key: 'LEADER',         statsKey: 'leaderCount',         neon: 'neon-leader',     image: '/rank-leader.svg'        },
  { key: 'GOLD_LEADER',    statsKey: 'goldLeaderCount',     neon: 'neon-gold',       image: '/rank-gold-leader.svg'   },
  { key: 'DIAMOND_LEADER', statsKey: 'diamondLeaderCount',  neon: 'neon-diamond',    image: '/rank-diamond-leader.svg'},
];

export function NetworkRankSection({ user, isAuthenticated, profile }: Props) {
  const { t } = useTranslation();
  const stats = useDirectNetworkStats();

  // Prefer live `profile.rank` (refreshed via /auth/profile) over the
  // login-cached `user.rank` so a server-side rank change reflects without
  // forcing logout+login.
  const currentRank = profile?.rank ?? user?.rank;
  const userRank = DASHBOARD_RANKS.find((r) => r.key === currentRank);

  return (
    <Card className="card-operator lg:col-span-3">
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <SectionTitle icon={Network} label={t('dashboard.networkRankSection')} />
          {isAuthenticated && currentRank && userRank && (
            <StatusBadge variant="primary">
              {(() => {
                const Icon = userRank.icon;
                return Icon ? <Icon className="size-3.5" /> : null;
              })()}
              {t(userRank.nameKey)}
            </StatusBadge>
          )}
        </div>

        <div className="flex flex-col gap-4 md:grid md:grid-cols-4 md:gap-3">
          {RANK_COUNTS.map(({ key, statsKey, neon, image }) => {
            const rank = DASHBOARD_RANKS.find((r) => r.key === key)!;
            const isActive = currentRank === key;
            const count = stats ? (stats[statsKey] as number) : undefined;
            return (
              <div key={key} className={cn('burger-tile', neon, isActive && 'is-active')}>
                {/* TOP — per-tier illustration + quota */}
                <div className="bun-top">
                  <img
                    src={image}
                    alt=""
                    aria-hidden
                    draggable={false}
                    className="tile-hero-img select-none"
                  />
                  <p className="neon-percent metric-figure text-base">
                    {rank.quotaBonus}
                  </p>
                  <p className="eyebrow mt-0.5">TIER QUOTA</p>
                </div>

                {/* PATTY — rank name + member count */}
                <div className="patty">
                  <p className="text-sm font-bold text-foreground leading-tight">
                    {t(rank.nameKey)}
                  </p>
                  {isActive && (
                    <p className="eyebrow neon-figure mt-0.5">
                      {t('dashboard.yourRankBadge')}
                    </p>
                  )}
                  <p className={cn('metric-figure text-2xl mt-1.5', isActive ? 'neon-figure' : 'text-foreground')}>
                    {isAuthenticated ? (count ?? '—') : '—'}
                  </p>
                  <p className="font-mono text-[11.5px] font-semibold text-foreground/85 leading-snug mt-2 px-2 tracking-wide">
                    {t(rank.requirementKey)}
                  </p>
                </div>

                {/* BOTTOM BUN — investment + max bonus */}
                <div className="bun-bottom">
                  <p className="eyebrow">MIN STAKE</p>
                  <p className="metric-figure text-base text-foreground mt-0.5">
                    {rank.personalInvest}
                  </p>
                  <p className="eyebrow mt-2">MAX YIELD</p>
                  <p className="metric-figure text-sm text-foreground mt-0.5">
                    {rank.bonusExample}
                  </p>
                </div>
              </div>
            );
          })}

        </div>

        <div className="divider-soft" />

        {/* PRO TIP card — illustration left, content right.
            Primary-tinted hairline + soft inner glow + tactile press feedback. */}
        <aside
          className="relative overflow-hidden rounded-2xl border border-[color:color-mix(in_oklab,var(--primary)_30%,var(--border))] bg-[color:color-mix(in_oklab,var(--primary)_4%,var(--card))] px-4 py-3 transition-transform duration-150 ease-out active:scale-[0.995]"
          style={{
            boxShadow:
              'inset 0 1px 0 color-mix(in oklab, var(--primary) 14%, transparent), 0 0 28px -14px color-mix(in oklab, var(--primary) 50%, transparent)',
          }}
        >
          {/* faint corner halo */}
          <div
            className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full opacity-60"
            style={{
              background:
                'radial-gradient(circle, color-mix(in oklab, var(--primary) 25%, transparent), transparent 70%)',
            }}
          />

          <div className="relative flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
            {/* Illustration */}
            <img
              src="/tip-unlock.svg"
              alt=""
              aria-hidden
              draggable={false}
              className="select-none w-[88px] h-[72px] shrink-0 drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]"
            />

            {/* Content */}
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <Lightbulb className="size-3.5 text-primary" />
                <p className="eyebrow text-primary">{t('dashboard.proTip')}</p>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[color:var(--success)]/15 border border-[color:var(--success)]/40 px-2 py-0.5 text-[10px] font-bold tracking-wider text-[color:var(--success)] font-mono">
                  +$500
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[58ch]">
                {t('dashboard.proTipText', {
                  rank: t('dashboard.rankDiamondLeader'),
                  amount: '$500',
                  attempts: t('dashboard.exclusiveAttempt'),
                  bot: 'Burger Bot',
                })}
              </p>
            </div>
          </div>
        </aside>
      </CardContent>
    </Card>
  );
}
