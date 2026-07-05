export const RANKS = ['MEMBERSHIP', 'LEADER', 'GOLD_LEADER', 'DIAMOND_LEADER'] as const;

export type Rank = (typeof RANKS)[number];

export const RANK_LABEL: Record<string, string> = {
  MEMBERSHIP: 'Membership',
  LEADER: 'Leader',
  GOLD_LEADER: 'Gold Leader',
  DIAMOND_LEADER: 'Diamond Leader',
};

export const RANK_COLOR: Record<string, string> = {
  MEMBERSHIP: 'text-slate-400',
  LEADER: 'text-violet-400',
  GOLD_LEADER: 'text-amber-400',
  DIAMOND_LEADER: 'text-cyan-400',
};
