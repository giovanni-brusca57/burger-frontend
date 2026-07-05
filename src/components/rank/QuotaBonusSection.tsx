import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';

export function QuotaBonusSection() {
  const { t } = useTranslation();

  const bonusTypes = [
    {
      labelKey: 'rank.activeBonusLabel',
      descKey: 'rank.activeBonusDesc',
    },
    {
      labelKey: 'rank.passiveBonusLabel',
      descKey: 'rank.passiveBonusDesc',
    },
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {t('rank.sectionQuota')}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {bonusTypes.map((b) => (
          <Card key={b.labelKey} className="border-border/50">
            <CardContent className="flex items-start gap-3 p-4">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <div className="size-2 rounded-full bg-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t(b.labelKey)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t(b.descKey)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-primary">{t('rank.quotaFormulaLabel')}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{t('rank.quotaFormulaQuota')}</span>{' '}
            {t('rank.quotaFormulaBody')}{' '}
            <span className="font-medium text-foreground">{t('rank.quotaFormulaCap')}</span>
            {'. '}{t('rank.quotaFormulaNote')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
