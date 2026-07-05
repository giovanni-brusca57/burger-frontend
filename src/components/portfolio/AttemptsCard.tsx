import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Zap, Bot, ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  mevAttempts: number;
  /**
   * Lucky Break attempts available right now — derived from /jackpot/status:
   * `1` when `eligible && !isSpun`, else `0`. Dimmed when zero.
   */
  luckyBreakAttempts: number;
}

/**
 * Attempts & Bots — tactical attempt-roster panel.
 * ────────────────────────────────────────────────────────────────────────
 *   ┏━ ⚡ ATTEMPTS · BOTS                                ●READY ━┓
 *   ┌────────────────────────────────────┐  ┌────────────────────────┐
 *   │ 〇 1 │ LUCKY · BREAK            ›  │  │ 〇 2 │ BURGER · BOT  │
 *   │       │ Daily attempt · resets…    │  │       │ Burger attempts│
 *   └────────────────────────────────────┘  └────────────────────────┘
 *   [ 🤖 OPEN · BURGER · BOT ────────────────────────────────────── ›]
 *
 * Each card uses the cred-slot pattern with a circular count-orb instead
 * of the hex badge — the count becomes the hero visual element. Lucky
 * Break uses gold + chevron (clickable → /lucky-break), Burger Bot uses
 * cyan. Disabled state when zero attempts available.
 */
export function AttemptsCard({ mevAttempts, luckyBreakAttempts }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hasLuckyBreak = luckyBreakAttempts > 0;
  const luckyOrbColor = hasLuckyBreak ? 'oklch(0.82 0.18 65)' : 'oklch(0.5 0.02 250)';

  return (
    <div className="op-id-card">
      <div className="tx-cmdbar">
        <span className="tx-cmdbar-title">
          <Zap className="size-3.5" />
          {t('portfolio.attemptsSection')}
        </span>
        <span className="tx-cmdbar-live">READY</span>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {/* ── Lucky Break (gold, clickable) ── */}
          <button
            onClick={() => navigate('/lucky-break')}
            className={cn('cred-slot', hasLuckyBreak ? 'cred-slot--gold' : 'cred-slot--violet')}
          >
            <div
              className={cn('count-orb', !hasLuckyBreak && 'count-orb--dim')}
              style={{ ['--co-c' as never]: luckyOrbColor }}
            >
              <span className="count-orb-value">{luckyBreakAttempts}</span>
            </div>
            <div className="cred-content">
              <span className="cred-label">{t('portfolio.luckyBreak')}</span>
              <span className="cred-sub">
                {t('portfolio.luckyBreakDaily')} · {t('portfolio.luckyBreakResets')}
              </span>
            </div>
            <ChevronRight className="cred-chevron size-4" />
          </button>

          {/* ── Burger Bot (cyan) ── */}
          <div className="cred-slot cred-slot--cyan">
            <div
              className="count-orb"
              style={{ ['--co-c' as never]: 'oklch(0.85 0.18 200)' }}
            >
              <span className="count-orb-value">{mevAttempts}</span>
            </div>
            <div className="cred-content">
              <span className="cred-label">{t('portfolio.burgerBot')}</span>
              <span className="cred-sub">
                {t('portfolio.mevAttempts')} · {t('portfolio.grantedByAdmin')}
              </span>
            </div>
          </div>
        </div>

        {/* ── CTA: Open Burger Bot ── */}
        <button
          onClick={() => window.open(import.meta.env.VITE_MEV_PAGE, '_blank')}
          className="neon-btn neon-btn--cyan w-full justify-between"
        >
          <span className="inline-flex items-center gap-2">
            <Bot className="size-3.5" />
            {t('portfolio.openBurgerBot')}
          </span>
          <ExternalLink className="size-3" />
        </button>
      </div>
    </div>
  );
}
