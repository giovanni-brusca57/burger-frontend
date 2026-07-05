import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, CalendarDays, Gift, CheckCircle2, XCircle, Loader2, Trophy, ListChecks } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { formatBalance } from '@/lib/helpers';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth.store';
import { useWalletStore } from '@/stores/wallet.store';
import {
  getJackpotStatus,
  spinJackpot,
  claimJackpot,
  isQuotaFullJackpotError,
  type JackpotStatus,
} from '@/lib/jackpot';

// ── Prize tiers (mirror the rates rolled by BE in jackpot.service.ts) ─────────

const PRIZE_TIERS = [
  { label: '0.5%', pct: 0.005, color: 'text-slate-300',   bg: 'bg-slate-500/20',   ring: 'ring-slate-400/40', jn: 'jackpot-num--silver',  rarity: 'Common',    loot: 'loot-row--common'    },
  { label: '1%',   pct: 0.01,  color: 'text-blue-300',    bg: 'bg-blue-500/20',    ring: 'ring-blue-400/40',  jn: 'jackpot-num--cyan',    rarity: 'Uncommon',  loot: 'loot-row--uncommon'  },
  { label: '3%',   pct: 0.03,  color: 'text-violet-300',  bg: 'bg-violet-500/20',  ring: 'ring-violet-400/40', jn: 'jackpot-num--violet', rarity: 'Rare',      loot: 'loot-row--rare'      },
  { label: '30%',  pct: 0.30,  color: 'text-emerald-300', bg: 'bg-green-500/20',   ring: 'ring-green-400/40', jn: 'jackpot-num--emerald', rarity: 'Epic',      loot: 'loot-row--epic'      },
  { label: '100%', pct: 1.00,  color: 'text-rose-300',    bg: 'bg-red-500/20',     ring: 'ring-red-400/40',   jn: 'jackpot-num--rose',   rarity: 'Legendary', loot: 'loot-row--legendary' },
];

const PERIOD_SCHEDULE = [
  { period: 1, days: 'Day 1–7' },
  { period: 2, days: 'Day 8–15' },
  { period: 3, days: 'Day 16–22' },
  { period: 4, days: 'Day 23–31' },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LuckyBreakPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const { wallets, fetchWallets, invalidate } = useWalletStore();

  const [status, setStatus] = useState<JackpotStatus | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      getJackpotStatus().then(setStatus).catch(() => {});
      // Need TRADING balance for the zero-balance pre-check; fetch in case the
      // user landed here without visiting MyWalletPage first.
      fetchWallets();
    }
  }, [isAuthenticated, fetchWallets]);

  // ── Derived state straight from BE response ────────────────────────────────
  const eligible = status?.eligible ?? false;
  const isSpun = status?.isSpun ?? false;
  const isClaimed = status?.isClaimed ?? false;
  // BE rolls reward against TRADING balance and rejects spin when it's 0.
  // Pre-check on FE to spare the network round-trip + give clearer copy.
  const tradingBalance = parseFloat(
    wallets.find((w) => w.apiType === 'TRADING')?.balance ?? '0',
  );
  const hasTradingBalance = tradingBalance > 0;
  const canSpin = eligible && !isSpun && !isSpinning && hasTradingBalance;
  const canClaim = eligible && isSpun && !isClaimed && !isClaiming;

  const rewardPctNum = status?.rewardPct ? parseFloat(String(status.rewardPct)) : 0;
  const rewardAmountNum = status?.rewardAmount ? parseFloat(String(status.rewardAmount)) : 0;
  const wonTier = PRIZE_TIERS.find((tier) => Math.abs(tier.pct - rewardPctNum) < 1e-9);

  async function refreshStatus() {
    try {
      const next = await getJackpotStatus();
      setStatus(next);
    } catch {
      /* swallow — UI keeps prior state */
    }
  }

  // Calling pattern is request → loading on FE → wait for BE response → refetch.
  async function handleSpin() {
    if (!canSpin) return;
    setIsSpinning(true);
    try {
      await spinJackpot();
      await refreshStatus();
    } catch (err: any) {
      // BE locks spin when bonus quota is fully filled — surface a localized
      // message instead of the raw English BE string.
      if (isQuotaFullJackpotError(err?.message)) {
        toast.error(t('luckyBreak.quotaFullSpin'));
      } else {
        toast.error(err?.message ?? t('luckyBreak.spinError'));
      }
    } finally {
      setIsSpinning(false);
    }
  }

  async function handleClaim() {
    if (!canClaim) return;
    setIsClaiming(true);
    try {
      const res = await claimJackpot();
      // BE caps the credit to fit remaining quota and flags it with `capped`.
      // Use a separate success message so the user understands they got less
      // than the raw roll.
      if (res.capped) {
        toast.success(t('luckyBreak.claimSuccessCapped', { amount: formatBalance(res.amount) }));
      } else {
        toast.success(t('luckyBreak.claimSuccess', { amount: formatBalance(res.amount) }));
      }
      await refreshStatus();
      // Reward credits PROFIT_NETWORK — refresh wallet store so the new balance shows.
      invalidate();
      fetchWallets();
    } catch (err: any) {
      if (isQuotaFullJackpotError(err?.message)) {
        toast.error(t('luckyBreak.quotaFullClaim'));
      } else {
        toast.error(err?.message ?? t('luckyBreak.claimError'));
      }
    } finally {
      setIsClaiming(false);
    }
  }

  const periodLabel = status ? `P${status.currentPeriod}` : '';

  return (
    <div className="space-y-8">

      {/* Hero — Dashboard pattern */}
      <div className="card-operator relative overflow-hidden p-5 sm:p-6">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-2/3 -z-0 opacity-60"
          style={{
            background:
              'radial-gradient(ellipse 60% 80% at 90% 50%, color-mix(in oklab, var(--warning) 16%, transparent), transparent 70%)',
          }}
        />
        {periodLabel && (
          <div className="absolute right-4 top-4 z-10 hidden sm:inline-flex">
            <span className="rounded-full bg-[color:var(--warning)]/15 border border-[color:var(--warning)]/40 px-2.5 py-0.5 text-[11px] font-extrabold text-[color:var(--warning)] tracking-wide font-mono">
              {periodLabel}
            </span>
          </div>
        )}
        <div className="relative z-10">
          <p className="eyebrow text-[color:var(--warning)]">// DAILY JACKPOT</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter leading-none mt-2 pr-24">
            {t('luckyBreak.pageTitle')}
          </h1>
          <p className="editorial-quote mt-2">
            &ldquo;One spin per period &mdash; refer hard, claim the break.&rdquo;
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-xl">
            {t('luckyBreak.pageSubtitle')}
          </p>
        </div>
      </div>

      {/* Eligibility banner — BE-supplied `message` when ineligible. */}
      {status && (
        <div
          className={cn(
            'rounded-xl border px-4 py-3 flex items-center gap-3',
            eligible ? 'border-amber-500/30 bg-amber-500/8' : 'border-border/50 bg-muted/20',
          )}
        >
          <div
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-full',
              eligible ? 'bg-amber-500/20' : 'bg-muted/30',
            )}
          >
            {eligible ? (
              <CheckCircle2 className="size-4 text-amber-400" />
            ) : (
              <XCircle className="size-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {eligible ? (
              <>
                <p className="text-sm font-semibold text-amber-300">
                  {t('luckyBreak.eligibleTitle', { period: periodLabel })}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t('luckyBreak.eligibleDesc')}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-foreground">
                  {t('luckyBreak.ineligibleTitle')}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {status.message ?? t('luckyBreak.referToQualify')}
                </p>
                {status.requiredRecruitmentPeriodLabel && (
                  <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                    {status.requiredRecruitmentPeriodLabel}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Main card */}
      <Card className="border-amber-400/25 bg-gradient-to-br from-amber-400/5 to-transparent overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col gap-4 px-4 pt-4 pb-4 sm:flex-row sm:items-stretch border-b border-amber-400/15">

            {/* Left: description + prize tiers + period table */}
            <div className="flex-1 space-y-4 min-w-0">

              {/* Jackpot title block — fresh design */}
              <div className="jackpot-header">
                <div className="jackpot-header-row">
                  <div className="jackpot-icon">
                    <Sparkles className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="jackpot-title">
                      <span className="jackpot-title-mute">Daily</span>{' '}
                      <span className="jackpot-title-accent">Jackpot</span>
                    </p>
                    <p className="jackpot-tagline">
                      Spin daily · win up to{' '}
                      <span className="jackpot-tagline-hot">100%</span> bonus
                    </p>
                  </div>
                </div>
                <p className="jackpot-desc">
                  {t('luckyBreak.description')}
                </p>
              </div>

              {/* Prize tiers — Las Vegas jackpot LED numbers */}
              <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('luckyBreak.prizePool')}
                </p>
                {PRIZE_TIERS.map((tier) => (
                  <div
                    key={tier.label}
                    className={cn(
                      'jackpot-num',
                      tier.jn,
                      isSpun && wonTier?.label === tier.label && 'is-winner',
                    )}
                  >
                    {/* data-glow duplicates the text into ::after — the breathing
                        glow layer that fades via opacity (scroll-safe) */}
                    <span className="jackpot-num-pct" data-glow={tier.label}>{tier.label}</span>
                    <span className="jackpot-num-label">{t('luckyBreak.bonus')}</span>
                  </div>
                ))}
              </div>

              {/* Period schedule — timeline track with 4 stops */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-muted-foreground" />
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {t('luckyBreak.periodSchedule')}
                  </p>
                </div>
                <div className="period-track">
                  {PERIOD_SCHEDULE.map((p) => {
                    const current = status?.currentPeriod ?? 0;
                    const isNow = current === p.period;
                    const isPast = current > p.period;
                    return (
                      <div
                        key={p.period}
                        className={cn(
                          'period-stop',
                          isNow && 'is-now',
                          isPast && 'is-past',
                        )}
                      >
                        <div className="period-stop-dot">P{p.period}</div>
                        <span className="period-stop-days">{p.days}</span>
                        {isNow && (
                          <span className="period-stop-now">{t('luckyBreak.now')}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Right: Jackpot Dispenser — capsule bay + pull lever + reward chute */}
            <div className="flex flex-col gap-3 sm:w-60 shrink-0">

              {/* TOKEN BAY — bouncing capsule */}
              <div className="jackpot-bay">
                <p className="jackpot-bay-label">{t('luckyBreak.todaysAttempt')}</p>
                <div className={cn('jackpot-capsule', !canSpin && 'is-empty')}>
                  {canSpin ? '1' : '0'}
                </div>
                <p className={cn('jackpot-bay-status', canSpin && 'is-ready')}>
                  {!eligible
                    ? t('luckyBreak.referToQualify')
                    : isClaimed
                      ? t('luckyBreak.usedToday')
                      : isSpun
                        ? t('luckyBreak.rewardReady')
                        : !hasTradingBalance
                          ? t('luckyBreak.zeroTradingBalance')
                          : '★ READY · PULL THE LEVER ★'}
                </p>
              </div>

              {/* PULL LEVER — big spin button (also handles spinning state inline) */}
              {isSpinning ? (
                <div className="jackpot-bay">
                  <div className="jackpot-spinning">
                    <div className="jackpot-spinning-orb" />
                    <p className="jackpot-spinning-label">{t('luckyBreak.rolling')}</p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleSpin}
                  disabled={!canSpin || isSpun}
                  className="jackpot-pull"
                >
                  <Sparkles className="size-4" />
                  <span>{t('luckyBreak.spinNow')}</span>
                </button>
              )}

              {/* REWARD CHUTE — emerald display + claim button */}
              <div className="jackpot-reward">
                <div className="jackpot-reward-header">
                  <span className="jackpot-reward-label">
                    <Gift className="size-3" />
                    {t('luckyBreak.luckyBalance')}
                  </span>
                  <span className="jackpot-reward-unit">USDT</span>
                </div>

                {/* If we have a won tier + reward, show it as the prize */}
                {isSpun && wonTier && !isClaimed && (
                  <p className={cn(
                    'text-center font-mono text-[9px] tracking-[0.2em] uppercase mb-1 font-bold',
                    wonTier.color,
                  )}>
                    YOU WON · {wonTier.label}
                  </p>
                )}

                <p
                  className={cn(
                    'jackpot-reward-num',
                    rewardAmountNum > 0 && !isClaimed ? 'has-prize' : 'is-empty',
                  )}
                  data-glow={`$${formatBalance(rewardAmountNum)}`}
                >
                  ${formatBalance(rewardAmountNum)}
                </p>

                <p className={cn(
                  'jackpot-reward-status',
                  rewardAmountNum > 0 && !isClaimed && 'is-ready',
                )}>
                  {isClaimed
                    ? t('luckyBreak.alreadyClaimed')
                    : isSpun
                      ? `★ ${t('luckyBreak.readyToClaim')} ★`
                      : canSpin
                        ? t('luckyBreak.pressSpinToTry')
                        : t('luckyBreak.noAttemptsAvailable')}
                </p>

                <div className="flex justify-center mt-1">
                  <button
                    disabled={!canClaim}
                    onClick={handleClaim}
                    className="neon-btn neon-btn--jreng neon-btn--jreng-emerald"
                    style={{
                      minWidth: 0,
                      height: '1.9rem',
                      fontSize: '0.6rem',
                      padding: '0 0.75rem',
                      letterSpacing: '0.08em',
                      gap: '0.3rem',
                      clipPath:
                        'polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)',
                    }}
                  >
                    {isClaiming ? <Loader2 className="size-3 animate-spin" /> : <Gift className="size-3" />}
                    <span>
                      {isClaiming
                        ? t('luckyBreak.claiming')
                        : isClaimed
                          ? t('luckyBreak.alreadyClaimed')
                          : t('luckyBreak.claim')}
                    </span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quest Stepper + Loot Drops — RPG-style protocol intel */}
      <div className="rounded-2xl border border-border/40 bg-card/40 p-4 sm:p-5 grid gap-6 sm:grid-cols-2">

        {/* HOW TO QUALIFY — Quest objectives stepper */}
        <div className="space-y-3.5">
          <p className="quest-section-title">
            <span className="quest-section-title-icon">
              <ListChecks className="size-3" />
            </span>
            <span><span className="text-amber-300/70">›</span> Quest · Objectives</span>
          </p>
          <ol className="quest-stepper">
            {[
              t('luckyBreak.step1', { period: periodLabel || 'current period' }),
              t('luckyBreak.step2'),
              t('luckyBreak.step3'),
              t('luckyBreak.step4'),
            ].map((step, i) => (
              <li key={i} className="quest-step">
                <div className="quest-step-node">{i + 1}</div>
                <p className="quest-step-text">{step}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* POSSIBLE REWARDS — RPG loot table */}
        <div className="space-y-3.5">
          <p className="quest-section-title">
            <span className="quest-section-title-icon">
              <Trophy className="size-3" />
            </span>
            <span><span className="text-amber-300/70">›</span> Loot · Drops</span>
          </p>
          <div className="loot-table">
            {PRIZE_TIERS.map((tier) => (
              <div key={tier.label} className={cn('loot-row', tier.loot)}>
                <span className="loot-pct">{tier.label}</span>
                <div className="loot-info">
                  <span className="loot-tag">{tier.rarity}</span>
                  <span className="loot-desc">{t('luckyBreak.onActiveInvestment')}</span>
                </div>
                <div className="loot-glyph" aria-hidden />
              </div>
            ))}
          </div>
          <p className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground/60 leading-relaxed">
            <span className="text-amber-300/60">ⓘ</span> {t('luckyBreak.appliedToTrading')}
          </p>
        </div>
      </div>

    </div>
  );
}
