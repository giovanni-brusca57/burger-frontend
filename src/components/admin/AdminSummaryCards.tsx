import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownToLine, ArrowUpFromLine, TrendingUp } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { formatBalance } from '@/lib/helpers';
import { getAdminSummary, type AdminSummary } from '@/lib/adminSummary';

export function AdminSummaryCards() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    getAdminSummary(ac.signal)
      .then(setSummary)
      .catch(() => setError(true));
    return () => ac.abort();
  }, []);

  // Keep the shell visible even when the BE endpoint isn't deployed yet —
  // shows zeroes + a discreet "BE not ready" hint so admins still see the layout.
  const items = [
    {
      key: 'totalDeposit',
      icon: ArrowDownToLine,
      labelKey: 'admin.summary.totalDeposit',
      value: summary?.totalDepositUsd ?? '0',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      ring: 'ring-emerald-500/30',
    },
    {
      key: 'totalWithdraw',
      icon: ArrowUpFromLine,
      labelKey: 'admin.summary.totalWithdraw',
      value: summary?.totalWithdrawUsd ?? '0',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      ring: 'ring-amber-500/30',
    },
    {
      key: 'totalInvestment',
      icon: TrendingUp,
      labelKey: 'admin.summary.totalInvestment',
      value: summary?.totalInvestmentUsd ?? '0',
      color: 'text-primary',
      bg: 'bg-primary/10',
      ring: 'ring-primary/30',
    },
  ];

  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map(({ key, icon: Icon, labelKey, value, color, bg, ring }) => (
          <Card key={key} className={cn('overflow-hidden')}>
            <CardContent className="flex items-center gap-3 p-3.5">
              <div className={cn('flex size-10 items-center justify-center rounded-xl ring-1', bg, ring)}>
                <Icon className={cn('size-4', color)} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {t(labelKey)}
                </p>
                <p className={cn('text-lg font-extrabold tabular-nums truncate', color)}>
                  ${formatBalance(value)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {error && (
        <p className="text-[10px] text-amber-400/80">
          {t('admin.summary.beNotReady')}
        </p>
      )}
    </div>
  );
}
