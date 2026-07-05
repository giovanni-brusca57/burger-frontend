import { useTranslation } from 'react-i18next';

function GlowText({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent">
      {children}
    </span>
  );
}

export function RankHero() {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background px-6 py-10 text-center sm:px-10 sm:py-14">
      <p
        className="pointer-events-none absolute inset-0 flex items-center justify-center text-[clamp(4rem,15vw,10rem)] font-black uppercase tracking-widest text-primary/5 select-none"
        aria-hidden
      >
        RANK
      </p>
      <div className="relative space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
          {t('rank.heroPlatform')}
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight sm:text-4xl lg:text-5xl">
          <GlowText>{t('rank.heroTitle')}</GlowText>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          {t('rank.heroDesc')}
        </p>
      </div>
    </div>
  );
}
