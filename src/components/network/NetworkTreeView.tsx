import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Users, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBalance } from '@/lib/helpers';
import { getNetworkTree, type NetworkNode, type NetworkTreeResponse } from '@/lib/auth';
import { getUserNetworkTree } from '@/lib/admin';

/**
 * Network Tree — tactical hierarchical roster.
 * ────────────────────────────────────────────────────────────────────────
 * Each node renders as a `.tree-node` (left rail glow + per-rank tint),
 * with the rank illustration from the dashboard (rank-membership.svg /
 * rank-leader.svg / rank-gold-leader.svg / rank-diamond-leader.svg) in a
 * haloed circular frame instead of the previous lucide icons.
 *
 * 5 stat orbs at the top use the same .const-pod constellation pattern
 * as the Network Status section above, so the page reads as one system.
 */

const RANK_VISUALS_TREE: Record<
  string,
  { label: string; img: string; accent: string; podVariant: string }
> = {
  MEMBERSHIP:     { label: 'Membership',     img: '/rank-membership.svg',     accent: 'oklch(0.74 0.14 50)',  podVariant: 'const-pod--bronze'  },
  LEADER:         { label: 'Leader',         img: '/rank-leader.svg',         accent: 'oklch(0.88 0.02 250)', podVariant: 'const-pod--silver'  },
  GOLD_LEADER:    { label: 'Gold Leader',    img: '/rank-gold-leader.svg',    accent: 'oklch(0.82 0.18 65)',  podVariant: 'const-pod--gold'    },
  DIAMOND_LEADER: { label: 'Diamond Leader', img: '/rank-diamond-leader.svg', accent: 'oklch(0.85 0.16 215)', podVariant: 'const-pod--diamond' },
};

const FALLBACK_RANK = RANK_VISUALS_TREE.MEMBERSHIP;

function TreeNode({
  node,
  depth = 0,
  showRaiderBadge = false,
}: {
  node: NetworkNode;
  depth?: number;
  showRaiderBadge?: boolean;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const visual = RANK_VISUALS_TREE[node.rank] ?? FALLBACK_RANK;
  const hasChildren = node.children.length > 0;

  return (
    <div className="space-y-1.5">
      <div
        className={cn('tree-node', depth === 0 && 'tree-node--root')}
        style={{ ['--rail' as never]: visual.accent }}
      >
        <button
          onClick={() => setExpanded((e) => !e)}
          disabled={!hasChildren}
          className="tree-toggle"
          aria-label={hasChildren ? (expanded ? 'Collapse' : 'Expand') : ''}
          style={{ ['--rail' as never]: visual.accent }}
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />
          ) : <span className="tree-toggle-dot" />}
        </button>

        {/* Rank illustration in haloed frame */}
        <div
          className="wallet-img-frame wallet-img-frame--sm"
          style={{ ['--wif-c' as never]: visual.accent }}
        >
          <img src={visual.img} alt="" aria-hidden draggable={false} />
        </div>

        <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
          <p className="font-cyber text-[13px] font-bold truncate text-foreground">
            {node.email}
          </p>
          <span className="tree-rank-pill">{visual.label}</span>
          {showRaiderBadge && node.isRaider && (
            <span className="tree-raider">
              <Zap className="size-2.5" /> RAIDER
            </span>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          <span className="tree-info-tag">L{node.depth}</span>
          {hasChildren && (
            <span className="tree-info-tag" style={{ color: 'oklch(0.85 0.018 250)' }}>
              {node.children.length} DIRECT
            </span>
          )}
          <span className="tree-investment">${formatBalance(node.tradingBalance)}</span>
        </div>
      </div>

      {expanded && hasChildren && (
        <div
          className="tree-children"
          style={{ ['--rail-parent' as never]: visual.accent }}
        >
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} showRaiderBadge={showRaiderBadge} />
          ))}
        </div>
      )}
    </div>
  );
}

interface NetworkTreeViewProps {
  userId?: string;
  showRaiderBadge?: boolean;
}

export function NetworkTreeView({ userId, showRaiderBadge = false }: NetworkTreeViewProps = {}) {
  const [data, setData] = useState<NetworkTreeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const fetcher = userId
      ? getUserNetworkTree(userId, controller.signal)
      : getNetworkTree(controller.signal);
    fetcher
      .then((d) => {
        if (!controller.signal.aborted) setData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data || data.totalMembers === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <div
          className="wallet-img-frame wallet-img-frame--md"
          style={{ ['--wif-c' as never]: 'oklch(0.55 0.02 250)' }}
        >
          <Users className="size-5 text-muted-foreground" />
        </div>
        <p className="font-cyber text-sm font-semibold tracking-widest text-muted-foreground">
          NO · NETWORK · MEMBERS
        </p>
        <p className="text-xs text-muted-foreground/70 font-mono tracking-wider">
          Share your referral link to grow your network
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Stat constellation orbs ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <div className="const-pod const-pod--cyan">
          <div className="const-orb">
            <span className="const-orb-value">{data.totalMembers}</span>
          </div>
          <span className="const-label">Total Members</span>
          <span className="const-sub">NETWORK</span>
        </div>
        <div className="const-pod const-pod--violet">
          <div className="const-orb">
            <span className="const-orb-value">{data.maxDepth}</span>
          </div>
          <span className="const-label">Max Depth</span>
          <span className="const-sub">LEVELS</span>
        </div>
        <div className="const-pod const-pod--mint">
          <div className="const-orb">
            <span className="const-orb-value">${formatBalance(data.totalTurnover)}</span>
          </div>
          <span className="const-label">Total Turnover</span>
          <span className="const-sub">USDT</span>
        </div>
        <div className="const-pod const-pod--diamond">
          <div className="const-orb">
            <span className="const-orb-value">{data.ranksCount.DIAMOND_LEADER}</span>
          </div>
          <span className="const-label">Diamonds</span>
          <span className="const-sub">TIER</span>
        </div>
        <div className="const-pod const-pod--gold">
          <div className="const-orb">
            <span className="const-orb-value">{data.ranksCount.GOLD_LEADER}</span>
          </div>
          <span className="const-label">Gold Leaders</span>
          <span className="const-sub">TIER</span>
        </div>
      </div>

      {/* ── Rank legend strip ── */}
      <div className="flex items-center gap-2 flex-wrap pl-1">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
          Network ranks
        </span>
        {(['MEMBERSHIP', 'LEADER', 'GOLD_LEADER', 'DIAMOND_LEADER'] as const).map((key) => {
          const v = RANK_VISUALS_TREE[key];
          const count = data.ranksCount[key];
          return (
            <span
              key={key}
              className="tree-rank-pill"
              style={{ ['--rail' as never]: v.accent }}
            >
              {count} {v.label}
            </span>
          );
        })}
      </div>

      {/* ── Tree ── */}
      <div className="space-y-1.5 max-h-[640px] overflow-y-auto pr-1">
        {data.tree.map((node) => (
          <TreeNode key={node.id} node={node} depth={0} showRaiderBadge={showRaiderBadge} />
        ))}
      </div>

      {/* ── Tactical hint footer ── */}
      <p className="font-mono text-[10px] text-muted-foreground/65 tracking-wider pt-1 text-center">
        <span className="text-foreground/80">›</span> Click chevron to expand each node ·{' '}
        <span className="text-foreground/80">L#</span> = depth ·{' '}
        <span className="text-foreground/80">DIRECT</span> = downlines ·{' '}
        <span className="text-emerald-400">$</span> = trading wallet
      </p>
    </div>
  );
}
