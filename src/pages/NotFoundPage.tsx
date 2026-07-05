import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 text-center overflow-hidden">
      {/* Ambient halo backdrop */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 40%, color-mix(in oklab, var(--primary) 16%, transparent), transparent 70%)',
        }}
      />

      <div className="flex flex-col items-center gap-8 max-w-md">
        <img
          src="/burger-logo.svg"
          alt="Burger"
          className="h-16 w-auto opacity-90 drop-shadow-[0_8px_24px_rgba(249,115,22,0.4)]"
        />

        <div className="flex flex-col items-center gap-3">
          <p className="metric-figure text-[9rem] leading-none text-transparent bg-clip-text bg-gradient-to-b from-foreground/40 to-foreground/5">
            404
          </p>
          <p className="eyebrow text-primary">// NOT FOUND</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter leading-none">
            {t('error.notFound')}
          </h1>
          <p className="editorial-quote max-w-sm mt-1">
            &ldquo;The mempool ate this route &mdash; bounce back to the dashboard.&rdquo;
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mt-1">
            {t('error.notFoundDescription')}
          </p>
        </div>

        <Button asChild className="px-8">
          <Link to="/dashboard">{t('nav.dashboard')}</Link>
        </Button>
      </div>
    </div>
  );
}
