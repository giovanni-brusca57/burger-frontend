import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Wrench, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { FeatureFlag } from '@/lib/featureFlags';

interface Props {
  flag?: FeatureFlag;
}

/** Shown in place of any page/section whose feature flag is currently disabled. */
export function MaintenancePage({ flag }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-[60vh] items-center justify-center px-4 py-12 overflow-hidden">
      {/* Ambient amber halo behind */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 50% 40% at 50% 50%, color-mix(in oklab, var(--warning) 14%, transparent), transparent 70%)',
        }}
      />

      <div className="card-operator flex flex-col items-center gap-5 px-7 py-9 max-w-md text-center">
        <div
          className="flex size-14 items-center justify-center rounded-2xl border border-[color:color-mix(in_oklab,var(--warning)_55%,var(--border))] text-[color:var(--warning)]"
          style={{
            background: 'color-mix(in oklab, var(--warning) 14%, transparent)',
            boxShadow: '0 0 24px -8px color-mix(in oklab, var(--warning) 55%, transparent)',
          }}
        >
          <Wrench className="size-6" />
        </div>

        <div className="flex flex-col gap-2 items-center">
          <p className="eyebrow text-[color:var(--warning)]">// MAINTENANCE</p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tighter leading-none">
            {t('maintenance.title')}
          </h1>
          <p className="editorial-quote text-base mt-1 max-w-sm">
            &ldquo;Cooking the patties &mdash; back in service shortly.&rdquo;
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-1">
            {flag?.message ?? t('maintenance.defaultMessage')}
          </p>
          {flag?.updatedAt && (
            <p className="text-xs text-muted-foreground/60 metric-figure pt-1">
              {t('maintenance.lastUpdated', {
                when: new Date(flag.updatedAt).toLocaleString(),
              })}
            </p>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="mt-1 gap-1.5"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="size-3.5" />
          {t('maintenance.backToDashboard')}
        </Button>
      </div>
    </div>
  );
}

export default MaintenancePage;
