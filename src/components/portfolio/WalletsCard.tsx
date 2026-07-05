import { useTranslation } from 'react-i18next';
import { Wallet, TrendingUp, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBalance } from '@/lib/helpers';
import type { ProfitSummary } from '@/lib/wallet';

// Per-wallet illustration map — single source of truth, mirrors the
// WALLET_VISUALS map used in components/wallet/WalletAssets.tsx so the
// Portfolio + My Wallet pages share the exact same icon set.
const WALLET_ART = {
  deposit:    { src: '/wallet-deposit.svg',    accent: 'oklch(0.72 0.17 152)' }, // emerald / DW
  trading:    { src: '/wallet-trading.svg',    accent: 'oklch(0.82 0.18 80)'  }, // amber / TW
  investment: { src: '/wallet-investment.svg', accent: 'oklch(0.85 0.18 200)' }, // cyan
  network:    { src: '/wallet-network.svg',    accent: 'oklch(0.72 0.22 295)' }, // violet
} as const;

interface Props {
  usdtBalance: string;
  tradingBalance: string;
  investmentProfitBalance: string;
  networkProfitBalance: string;
  profitSummary: ProfitSummary | null;
}

/**
 * Wallets · Available Balance
 * ────────────────────────────────────────────────────────────────────────
 * Tactical HUD reskin of the portfolio wallets section:
 *
 *   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
 *   ┃ 💼 WALLETS · AVAILABLE BALANCE                       ● LIVE  ┃
 *   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
 *
 *   ┌────────────┐  ┌────────────────────┐  ┌────────────────────┐
 *   │ DW · MINT  │  │ TW · GOLD          │  │ PROFIT · CYAN      │
 *   │ ⬡          │  │ ⬡                  │  │ ⬡                  │
 *   │ $1,284.52  │  │ $500               │  │ Profit Wallets     │
 *   │ USDT · DW  │  │ USDT · TW          │  │ ┌─INV  $247.84──┐  │
 *   │            │  │ PROFIT QUOTA  64%  │  │ ┌─NET  $189.67──┐  │
 *   │            │  │ ▓▓▓▓▓▓▓░░░░░░ LED  │  │                    │
 *   │            │  │ Earned · Cap       │  │                    │
 *   └────────────┘  └────────────────────┘  └────────────────────┘
 *
 * The PROFIT QUOTA bar reuses .quota-bar-shell / .quota-bar-fill — the
 * animated LED bar from the wallet page (gold default, magenta when full).
 */
export function WalletsCard({
  usdtBalance,
  tradingBalance,
  investmentProfitBalance,
  networkProfitBalance,
  profitSummary,
}: Props) {
  const { t } = useTranslation();

  // Pre-compute profit quota state — used to render the animated LED bar
  // inside the Trading Wallet tile.
  const quota   = profitSummary?.quota;
  const hasQuota = !!quota && parseFloat(quota.maxQuota) > 0;
  const earned   = hasQuota ? parseFloat(quota!.totalReceived) : 0;
  const maxQuota = hasQuota ? parseFloat(quota!.maxQuota) : 0;
  const pct      = hasQuota ? Math.min(100, quota!.progressPercentage) : 0;
  const full     = hasQuota && quota!.isExhausted;

  return (
    <div className="space-y-6">
      {/* ────────────────────────────────────────────────────────────────
          Block 1 — Wallets · Available Balance
          ──────────────────────────────────────────────────────────────── */}
      <div className="op-id-card">
        <div className="tx-cmdbar">
          <span className="tx-cmdbar-title">
            <Wallet className="size-3.5" />
            {t('portfolio.walletsSection')}
          </span>
          <span className="tx-cmdbar-live">LIVE</span>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-[11px] text-muted-foreground font-mono tracking-wider">
            {t('portfolio.walletsDesc')}
          </p>

          <div className="grid gap-3 sm:grid-cols-3">

            {/* ── Deposit Wallet (mint) ── */}
            <div className="wallet-tile wallet-tile--mint">
              <div className="wallet-tile-head">
                <span className="wallet-tile-label">{t('portfolio.depositWallet')}</span>
                <div
                  className="wallet-img-frame wallet-img-frame--md"
                  style={{ ['--wif-c' as never]: WALLET_ART.deposit.accent }}
                >
                  <img src={WALLET_ART.deposit.src} alt="" aria-hidden draggable={false} />
                </div>
              </div>
              <p className="wallet-tile-amount">${formatBalance(usdtBalance)}</p>
              <p className="wallet-tile-sub">USDT · DW</p>
            </div>

            {/* ── Trading Wallet (gold) + Profit Quota LED bar ── */}
            <div className="wallet-tile wallet-tile--gold">
              <div className="wallet-tile-head">
                <span className="wallet-tile-label">{t('portfolio.tradingWallet')}</span>
                <div
                  className="wallet-img-frame wallet-img-frame--md"
                  style={{ ['--wif-c' as never]: WALLET_ART.trading.accent }}
                >
                  <img src={WALLET_ART.trading.src} alt="" aria-hidden draggable={false} />
                </div>
              </div>
              <p className="wallet-tile-amount">${formatBalance(tradingBalance)}</p>
              <p className="wallet-tile-sub">USDT · TW</p>

              {hasQuota && (
                <div className="mt-1 pt-2 border-t border-white/8 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9.5px] font-bold tracking-[0.16em] uppercase text-amber-300/85">
                      {t('portfolio.profitQuota')}
                    </span>
                    <span className={cn(
                      'font-cyber text-[10px] font-extrabold tabular-nums tracking-wider',
                      full ? 'text-fuchsia-300' : 'text-amber-300'
                    )}>
                      {full ? '★ FULL' : `${pct.toFixed(0)}%`}
                    </span>
                  </div>
                  {/* Animated LED quota bar — gold default, magenta when full */}
                  <div className="quota-bar-shell h-2.5">
                    <div
                      className={cn('quota-bar-fill', full && 'quota-bar-fill--full')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between font-mono text-[9.5px] tracking-wider">
                    <span className="text-muted-foreground">
                      {t('portfolio.earned')}:{' '}
                      <span className="font-bold text-foreground tabular-nums">${formatBalance(earned)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {t('portfolio.cap')}:{' '}
                      <span className="font-bold text-foreground tabular-nums">${formatBalance(maxQuota)}</span>
                    </span>
                  </div>
                  <p className={cn(
                    'text-[9.5px] leading-snug font-mono tracking-wide',
                    full ? 'text-fuchsia-300/90 font-semibold' : 'text-muted-foreground/65'
                  )}>
                    {full ? t('portfolio.quotaFullHint') : t('portfolio.quotaHint')}
                  </p>
                </div>
              )}
            </div>

            {/* ── Profit Wallets (cyan/violet pair) ── */}
            <div className="wallet-tile wallet-tile--cyan">
              <div className="wallet-tile-head">
                <span className="wallet-tile-label">{t('portfolio.profitWalletsTitle')}</span>
                <div
                  className="wallet-img-frame wallet-img-frame--md"
                  style={{ ['--wif-c' as never]: WALLET_ART.investment.accent }}
                >
                  <img src={WALLET_ART.investment.src} alt="" aria-hidden draggable={false} />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono leading-snug">
                {t('portfolio.profitWalletsDesc')}
              </p>
              <div className="space-y-1.5 mt-1">
                <div className="wallet-mini wallet-mini--cyan">
                  <div className="flex flex-col gap-0.5">
                    <span className="wallet-mini-label">{t('portfolio.profitInvestmentLabel')}</span>
                    <span className="wallet-mini-desc">{t('portfolio.profitInvestmentDesc')}</span>
                  </div>
                  <span className="wallet-mini-amount">${formatBalance(investmentProfitBalance)}</span>
                </div>
                <div className="wallet-mini wallet-mini--violet">
                  <div className="flex flex-col gap-0.5">
                    <span className="wallet-mini-label">{t('portfolio.profitNetworkLabel')}</span>
                    <span className="wallet-mini-desc">{t('portfolio.profitNetworkDesc')}</span>
                  </div>
                  <span className="wallet-mini-amount">${formatBalance(networkProfitBalance)}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          Block 2 — Profit Breakdown · Lifetime Earnings
          Reuses cred-slot pattern (badge + label + value) — matches the
          AccountCard credentials look so the whole page feels coherent.
          ──────────────────────────────────────────────────────────────── */}
      <div className="op-id-card">
        <div className="tx-cmdbar">
          <span className="tx-cmdbar-title">
            <TrendingUp className="size-3.5" />
            {t('portfolio.profitBreakdownSection')}
          </span>
          <span className="tx-cmdbar-live">LIFETIME</span>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-[11px] text-muted-foreground font-mono tracking-wider">
            {t('portfolio.profitBreakdownDesc')}
          </p>

          {/* ── Investment Profit — CYAN, matches "Investment" wallet on My Wallet ── */}
          <div className="cred-slot cred-slot--cyan">
            <div
              className="wallet-img-frame wallet-img-frame--sm"
              style={{ ['--wif-c' as never]: WALLET_ART.investment.accent }}
            >
              <img src={WALLET_ART.investment.src} alt="" aria-hidden draggable={false} />
            </div>
            <div className="cred-content">
              <span className="cred-label">{t('portfolio.investmentProfit')}</span>
              <span className="cred-sub">{t('portfolio.investmentProfitDesc')}</span>
            </div>
            <div className="text-right">
              <p className="font-cyber text-lg font-extrabold tabular-nums text-cyan-300"
                 style={{ textShadow: '0 0 12px oklch(0.85 0.18 200 / 0.55)' }}>
                ${profitSummary
                  ? formatBalance(
                      (parseFloat(profitSummary.tradingProfit) +
                        parseFloat(profitSummary.investmentProfit)).toFixed(6),
                    )
                  : '—'}
              </p>
              <p className="font-mono text-[9px] tracking-widest text-muted-foreground">USDT</p>
            </div>
          </div>

          {/* ── Network Profit — VIOLET, matches "Network" wallet on My Wallet ── */}
          <div className="cred-slot cred-slot--violet">
            <div
              className="wallet-img-frame wallet-img-frame--sm"
              style={{ ['--wif-c' as never]: WALLET_ART.network.accent }}
            >
              <img src={WALLET_ART.network.src} alt="" aria-hidden draggable={false} />
            </div>
            <div className="cred-content">
              <span className="cred-label">{t('portfolio.networkProfit')}</span>
              <span className="cred-sub">{t('portfolio.networkProfitDesc')}</span>
            </div>
            <div className="text-right">
              <p className="font-cyber text-lg font-extrabold tabular-nums text-violet-300"
                 style={{ textShadow: '0 0 12px oklch(0.78 0.18 305 / 0.55)' }}>
                ${profitSummary ? formatBalance(profitSummary.networkProfit) : '—'}
              </p>
              <p className="font-mono text-[9px] tracking-widest text-muted-foreground">USDT</p>
            </div>
          </div>

          {/* ── Total earned — GOLD as the summary highlight (not on My Wallet,
                so it gets a distinct warm accent that contrasts the cyan+violet
                children) ── */}
          <div className="cred-slot cred-slot--gold">
            <div
              className="wallet-img-frame wallet-img-frame--sm"
              style={{ ['--wif-c' as never]: WALLET_ART.trading.accent }}
            >
              <img src={WALLET_ART.trading.src} alt="" aria-hidden draggable={false} />
            </div>
            <div className="cred-content">
              <span className="cred-label">{t('portfolio.totalEarned')}</span>
              <span className="cred-sub">ALL · TIME</span>
            </div>
            <div className="text-right">
              <p className="font-cyber text-xl font-extrabold tabular-nums text-amber-300"
                 style={{ textShadow: '0 0 14px oklch(0.82 0.18 65 / 0.6)' }}>
                ${profitSummary ? formatBalance(profitSummary.totalEarned) : '—'}
              </p>
              <p className="font-mono text-[9px] tracking-widest text-muted-foreground">USDT</p>
            </div>
          </div>

          {/* Info note */}
          <div className="cred-slot cred-slot--violet !py-2.5">
            <div className="cred-badge">
              <Info className="size-3.5" />
            </div>
            <p className="text-[11px] text-violet-200/80 leading-snug font-mono col-span-2">
              {t('portfolio.quotaInfo')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
