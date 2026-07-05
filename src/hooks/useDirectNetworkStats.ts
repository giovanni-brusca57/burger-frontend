import { useEffect, useState } from 'react';
import { getNetworkTreeCached } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth.store';

export interface DirectNetworkStats {
  membershipCount: number;
  leaderCount: number;
  goldLeaderCount: number;
  diamondLeaderCount: number;
  totalDirect: number;
  /** Sum of all direct downlines' TRADING wallet balances (formatted to 6 decimals). */
  activeTradingTotal: string;
}

/**
 * Derives direct-downline stats (rank counts + sum of trading balances) from
 * the `/auth/network-tree` response. The root nodes of `tree` are by definition
 * the direct downlines (depth=1), so we iterate them rather than walking the
 * full tree.
 *
 * BE's `getProfile` only ships `totalDirectDownline`; everything else here is
 * computed FE-side from the tree response — avoids a BE schema change.
 */
export function useDirectNetworkStats(): DirectNetworkStats | null {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [stats, setStats] = useState<DirectNetworkStats | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setStats(null);
      return;
    }
    let cancelled = false;
    getNetworkTreeCached()
      .then((res) => {
        if (cancelled) return;
        const counts = { MEMBERSHIP: 0, LEADER: 0, GOLD_LEADER: 0, DIAMOND_LEADER: 0 };
        let trading = 0;
        for (const node of res.tree) {
          counts[node.rank as keyof typeof counts] =
            (counts[node.rank as keyof typeof counts] ?? 0) + 1;
          trading += parseFloat(node.tradingBalance) || 0;
        }
        setStats({
          membershipCount: counts.MEMBERSHIP,
          leaderCount: counts.LEADER,
          goldLeaderCount: counts.GOLD_LEADER,
          diamondLeaderCount: counts.DIAMOND_LEADER,
          totalDirect: res.tree.length,
          activeTradingTotal: trading.toFixed(6),
        });
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return stats;
}
