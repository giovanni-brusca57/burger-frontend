import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Cpu } from 'lucide-react';

/**
 * Burger Engine — automated trading CTA card.
 * Wallet-tile pattern (violet accent) with the existing engine illustration
 * promoted to the headline + Invest Now button anchored at the bottom.
 */
export function BurgerEngineCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="wallet-tile wallet-tile--violet h-full">
      <div className="wallet-tile-head">
        <span className="wallet-tile-label">{t('dashboard.burgerEngine')}</span>
        <div className="wallet-tile-badge">
          <Cpu className="size-3.5" />
        </div>
      </div>

      {/* Tagline + description — both JetBrains Mono so the two adjacent
          body paragraphs feel like one coherent text block. Tagline gets
          weight + cyan accent for hierarchy; description sits muted below. */}
      <p className="font-mono text-[13px] font-bold text-fuchsia-200 leading-tight tracking-wide">
        {t('dashboard.burgerEngineTagline')}
      </p>
      <p className="font-mono text-[12px] tracking-wide text-muted-foreground/85 leading-snug">
        {t('dashboard.burgerEngineDesc')}
      </p>

      <button
        onClick={() => navigate('/my-wallet')}
        className="neon-btn neon-btn--violet w-[88%] mx-auto mt-auto justify-center"
      >
        <span>{t('dashboard.investNow')}</span>
      </button>
    </div>
  );
}
