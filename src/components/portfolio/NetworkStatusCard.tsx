import { useTranslation } from 'react-i18next';
import { Network } from 'lucide-react';
import { formatBalance } from '@/lib/helpers';
import { useDirectNetworkStats } from '@/hooks/useDirectNetworkStats';
import type { UserProfile } from '@/types/auth.types';

interface Props {
  profile: UserProfile | null;
}

/**
 * Network · Status — Constellation pod grid.
 * ────────────────────────────────────────────────────────────────────────
 * Each metric renders as a circular "sensor orb" with a tier-tinted neon
 * ring, an LED dot orbiting the perimeter, and a slow radar scan-sweep
 * underneath. The orb is the hero element — the count sits in its center
 * in Orbitron with a neon halo. Label + sub-tag sit below the orb.
 *
 *   ┏━ 🕸 NETWORK · STATUS                                  ●PING ━┓
 *      ⭕         ⭕          ⭕
 *       12          $1,284      8                              row 1
 *      Total       Active       Membership
 *      Direct      Trading      Bronze tier
 *
 *      ⭕         ⭕          ⭕
 *       3           2           1                              row 2
 *      Leader     Gold Leader   Diamond Leader
 *      Silver     Gold tier     Diamond tier
 *   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
 */

interface PodSpec {
  key: string;
  label: string;
  value: string | number;
  sub?: string;
  variant: string;
}

function Pod({ spec }: { spec: PodSpec }) {
  return (
    <div className={`const-pod ${spec.variant}`}>
      <div className="const-orb">
        <span className="const-orb-value">{spec.value}</span>
      </div>
      <span className="const-label">{spec.label}</span>
      {spec.sub && <span className="const-sub">{spec.sub}</span>}
    </div>
  );
}

export function NetworkStatusCard({ profile }: Props) {
  const { t } = useTranslation();
  const stats = useDirectNetworkStats();

  // Canonical totals — `profile.totalDirectDownline` from BE wins over the
  // tree-derived count so the value stays populated while the tree loads.
  const totalDirect   = profile?.totalDirectDownline ?? stats?.totalDirect ?? '—';
  const activeTrading = stats ? `$${formatBalance(stats.activeTradingTotal)}` : '—';
  const membership    = stats?.membershipCount     ?? '—';
  const leader        = stats?.leaderCount         ?? '—';
  const goldLeader    = stats?.goldLeaderCount     ?? '—';
  const diamondLeader = stats?.diamondLeaderCount  ?? '—';

  // 6 pods — top row is the headline metrics, bottom row is the tier breakdown.
  // Tier color mapping mirrors the dashboard NetworkRankSection.
  const pods: PodSpec[] = [
    { key: 'total',    label: t('portfolio.totalDirect'),         value: totalDirect,   sub: 'DIRECT',          variant: 'const-pod--cyan'    },
    { key: 'active',   label: t('portfolio.activeTrading'),       value: activeTrading, sub: t('portfolio.tradingWalletTotal'), variant: 'const-pod--gold' },
    { key: 'member',   label: t('portfolio.membership'),          value: membership,    sub: 'BRONZE',          variant: 'const-pod--bronze'  },
    { key: 'leader',   label: t('portfolio.leaderDirect'),        value: leader,        sub: 'SILVER',          variant: 'const-pod--silver'  },
    { key: 'gold',     label: t('portfolio.goldLeaderDirect'),    value: goldLeader,    sub: 'GOLD',            variant: 'const-pod--violet'  },
    { key: 'diamond',  label: t('portfolio.diamondLeaderDirect'), value: diamondLeader, sub: 'DIAMOND',         variant: 'const-pod--diamond' },
  ];

  return (
    <div className="op-id-card">
      <div className="tx-cmdbar">
        <span className="tx-cmdbar-title">
          <Network className="size-3.5" />
          {t('portfolio.networkStatusSection')}
        </span>
        <span className="tx-cmdbar-live">PING</span>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {pods.map((spec) => (
            <Pod key={spec.key} spec={spec} />
          ))}
        </div>
      </div>
    </div>
  );
}
