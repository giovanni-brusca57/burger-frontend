import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Coins } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { formatBalance } from '@/lib/helpers';
import type { PresaleStats } from '@/lib/presale';

interface Props {
  presale: PresaleStats;
}

export function PresaleBanner({ presale }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const sold = parseFloat(presale.totalSold);
  const alloc = parseFloat(presale.presaleAllocation);
  const remaining = parseFloat(presale.remaining);
  const pct = alloc > 0 ? Math.min((sold / alloc) * 100, 100) : 0;
  const price = parseFloat(presale.price);

  return (
    <Card className="card-operator overflow-hidden">
      <CardContent className="p-4 sm:p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border text-primary">
            <Coins className="size-5" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="eyebrow">// PRESALE</p>
              <p className="text-base font-bold text-foreground">
                {t('dashboard.presaleCardTitle')}
              </p>
              <StatusBadge variant="active" animated>
                {t('dashboard.active')}
              </StatusBadge>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="metric-figure">{pct.toFixed(1)}% sold</span>
                <span className="metric-figure">
                  {remaining.toLocaleString('en-US', { maximumFractionDigits: 0 })} remaining
                </span>
              </div>
              <div className="h-2 w-full bg-surface-soft overflow-hidden rounded-2xl">
                <div
                  className="h-full bg-primary transition-[width] duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col items-end gap-1">
            <StatusBadge variant="primary">{`$${formatBalance(price)}`}</StatusBadge>
            <p className="text-xs text-muted-foreground">per token</p>
          </div>
          <Button onClick={() => navigate('/presale')}>
            <Coins className="size-3.5 mr-1.5" />
            {t('dashboard.presaleCardCta')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
