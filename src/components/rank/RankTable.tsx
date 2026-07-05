import { useTranslation } from 'react-i18next';
import { Crown, Star, Shield, Gem } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

const RANKS = [
  {
    key: 'MEMBERSHIP',
    nameKey: 'dashboard.rankMembership',
    icon: Shield,
    color: 'text-slate-400',
    bg: 'bg-slate-400/10',
    border: 'border-slate-400/20',
    depositRangeKey: 'rank.depositRangeMembership',
    requirementKey: 'rank.reqMembership',
    quotaBonus: '100%',
    bonusExample: '$500',
    highlight: false,
  },
  {
    key: 'LEADER',
    nameKey: 'dashboard.rankLeader',
    icon: Star,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    depositRangeKey: 'rank.depositRangeLeader',
    requirementKey: 'rank.reqLeader',
    quotaBonus: '150%',
    bonusExample: '$750',
    highlight: true,
  },
  {
    key: 'GOLD_LEADER',
    nameKey: 'dashboard.rankGoldLeader',
    icon: Crown,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
    depositRangeKey: 'rank.depositRangeGoldLeader',
    requirementKey: 'rank.reqGoldLeader',
    quotaBonus: '200%',
    bonusExample: '$1,000',
    highlight: false,
  },
  {
    key: 'DIAMOND_LEADER',
    nameKey: 'dashboard.rankDiamondLeader',
    icon: Gem,
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/20',
    depositRangeKey: 'rank.depositRangeDiamondLeader',
    requirementKey: 'rank.reqDiamondLeader',
    quotaBonus: '300%',
    bonusExample: '$1,500',
    highlight: false,
  },
] as const;

export function RankTable() {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {t('rank.sectionOverview')}
      </h2>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-border/50 md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              {[
                t('rank.colRank'),
                t('rank.colDepositRange'),
                t('rank.colRequirement'),
                t('rank.colQuotaBonus'),
                t('rank.colExample'),
              ].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {RANKS.map((rank) => {
              const Icon = rank.icon;
              return (
                <tr
                  key={rank.key}
                  className={cn(
                    'transition-colors hover:bg-muted/20',
                    rank.highlight && 'bg-primary/5'
                  )}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', rank.bg)}>
                        <Icon className={cn('size-4', rank.color)} />
                      </div>
                      <span className={cn('font-semibold', rank.highlight ? 'text-primary' : '')}>
                        {t(rank.nameKey)}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {t(rank.depositRangeKey)}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {t(rank.requirementKey)}
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1', rank.bg, rank.color, rank.border)}>
                      {rank.quotaBonus}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">
                        {t('rank.quotaCalc', { deposit: '$500', bonus: rank.quotaBonus })}
                      </p>
                      <p className={cn('font-semibold', rank.color)}>
                        {t('rank.maxBonusValue', { value: rank.bonusExample })}
                      </p>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {RANKS.map((rank) => {
          const Icon = rank.icon;
          return (
            <Card
              key={rank.key}
              className={cn('border-border/50', rank.highlight && 'border-primary/40 bg-primary/5')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 pb-3">
                  <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', rank.bg)}>
                    <Icon className={cn('size-5', rank.color)} />
                  </div>
                  <div>
                    <p className={cn('font-bold', rank.highlight ? 'text-primary' : '')}>
                      {t(rank.nameKey)}
                    </p>
                    <p className="text-xs text-muted-foreground">{t(rank.depositRangeKey)}</p>
                  </div>
                  <span className={cn('ml-auto inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1', rank.bg, rank.color, rank.border)}>
                    {rank.quotaBonus}
                  </span>
                </div>
                <div className="space-y-2 border-t border-border/40 pt-3 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{t('rank.colRequirement')}</span>
                    <span className="text-right font-medium">{t(rank.requirementKey)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{t('rank.colMaxBonus')}</span>
                    <span className={cn('font-bold', rank.color)}>{rank.bonusExample}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
