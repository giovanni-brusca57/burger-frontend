import { useTranslation } from 'react-i18next';
import { Crown, Star, Shield, Gem } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

const RANKS = [
  { key: 'MEMBERSHIP',     nameKey: 'dashboard.rankMembership',     icon: Shield, color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20', bonusExample: '$500',   highlight: false },
  { key: 'LEADER',         nameKey: 'dashboard.rankLeader',         icon: Star,   color: 'text-primary',   bg: 'bg-primary/10',   border: 'border-primary/30',   bonusExample: '$750',   highlight: true  },
  { key: 'GOLD_LEADER',    nameKey: 'dashboard.rankGoldLeader',     icon: Crown,  color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', bonusExample: '$1,000', highlight: false },
  { key: 'DIAMOND_LEADER', nameKey: 'dashboard.rankDiamondLeader',  icon: Gem,    color: 'text-cyan-400',  bg: 'bg-cyan-400/10',  border: 'border-cyan-400/20',  bonusExample: '$1,500', highlight: false },
] as const;

export function RankComparisonGrid() {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {t('rank.sectionComparison')}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {RANKS.map((rank) => {
          const Icon = rank.icon;
          return (
            <Card
              key={rank.key}
              className={cn(
                'border-border/50 transition-colors hover:border-primary/30',
                rank.highlight && 'border-primary/40'
              )}
            >
              <CardContent className="flex flex-col items-center gap-3 p-4 text-center">
                <div className={cn('flex size-10 items-center justify-center rounded-full', rank.bg)}>
                  <Icon className={cn('size-5', rank.color)} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t(rank.nameKey)}
                  </p>
                  <p className={cn('text-xl font-black', rank.color)}>
                    {rank.bonusExample}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{t('rank.maxBonus')}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
