import {
  DollarSign,
  BarChart3,
  Users,
  Zap,
  Shield,
  Star,
  Crown,
  Gem,
} from 'lucide-react';

export const DASHBOARD_MODULES = [
  { nameKey: 'dashboard.modRevenue',       abbr: 'RM', icon: DollarSign, status: 'active'  as const },
  { nameKey: 'dashboard.modAnalytics',     abbr: 'AE', icon: BarChart3,  status: 'active'  as const },
  { nameKey: 'dashboard.modUserService',   abbr: 'US', icon: Users,      status: 'active'  as const },
  { nameKey: 'dashboard.modTaskScheduler', abbr: 'TS', icon: Zap,        status: 'offline' as const },
];

export const DASHBOARD_RANKS = [
  {
    key: 'MEMBERSHIP',
    nameKey: 'dashboard.rankMembership',
    icon: Shield,
    color: 'text-slate-400',
    bg: 'bg-slate-400/10',
    border: 'border-slate-400/20',
    requirementKey: 'dashboard.reqMembership',
    personalInvest: '$30',
    quotaBonus: '100%',
    bonusExample: '$500',
  },
  {
    key: 'LEADER',
    nameKey: 'dashboard.rankLeader',
    icon: Star,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    requirementKey: 'dashboard.reqLeader',
    personalInvest: '$30',
    quotaBonus: '150%',
    bonusExample: '$750',
  },
  {
    key: 'GOLD_LEADER',
    nameKey: 'dashboard.rankGoldLeader',
    icon: Crown,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
    requirementKey: 'dashboard.reqGoldLeader',
    personalInvest: '$100',
    quotaBonus: '200%',
    bonusExample: '$1,000',
  },
  {
    key: 'DIAMOND_LEADER',
    nameKey: 'dashboard.rankDiamondLeader',
    icon: Gem,
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/20',
    requirementKey: 'dashboard.reqDiamondLeader',
    personalInvest: '$500',
    quotaBonus: '300%',
    bonusExample: '$1,500',
  },
] as const;

export type DashboardRankConfig = (typeof DASHBOARD_RANKS)[number];
