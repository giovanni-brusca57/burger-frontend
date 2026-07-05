import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Coins, TrendingUp, DollarSign, BarChart3, ShoppingCart, Activity, Wallet, Receipt } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { formatBalance } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { useWalletStore } from '@/stores/wallet.store';
import { usePresaleStore } from '@/stores/presale.store';
import {
  buyTokens,
  getMyPurchases,
  getPresaleEligibility,
  type TokenPurchaseEntry,
  type PresaleEligibility,
} from '@/lib/presale';

// ── Tokenomics breakdown ─────────────────────────────────────────────────────

const TOKENOMICS = [
  { label: 'Presale',   pct: 10, color: 'bg-cyan-400',    text: 'text-cyan-400' },
  { label: 'Liquidity', pct: 20, color: 'bg-blue-400',    text: 'text-blue-400' },
  { label: 'Ecosystem', pct: 30, color: 'bg-violet-400',  text: 'text-violet-400' },
  { label: 'Team',      pct: 15, color: 'bg-amber-400',   text: 'text-amber-400' },
  { label: 'Reserve',   pct: 25, color: 'bg-emerald-400', text: 'text-emerald-400' },
];

/**
 * Bonus allocation surfaced only on the FE — pads the BE-served allocation
 * (currently 5,000,000) up to a public 50,000,000 marketing total. Adjust
 * this once the BE starts tracking the full 50M itself.
 */
const FE_BONUS_ALLOCATION = 0;

/**
 * Compact token-count formatter for the telemetry stat tiles — values in the
 * millions get abbreviated ("4.99M") so they never ellipsize inside the
 * fixed-width tiles. Floors (not rounds) so "remaining" is never overstated.
 */
function fmtTokenCount(n: number): string {
  if (n >= 1_000_000) {
    const m = Math.floor(n / 10_000) / 100; // 4,999,975 → 4.99
    return `${m.toLocaleString('en-US', { maximumFractionDigits: 2 })}M`;
  }
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PresalePage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const { wallets, fetchWallets, invalidate } = useWalletStore();
  const { stats, fetchStats, invalidate: invalidatePresale } = usePresaleStore();

  const usdtBalance = wallets.find((w) => w.apiType === 'USDT')?.balance ?? '0';
  const [purchases, setPurchases] = useState<TokenPurchaseEntry[]>([]);
  const [totalTokens, setTotalTokens] = useState('0');
  const [totalSpent, setTotalSpent] = useState('0');
  const [tokenInput, setTokenInput] = useState('');
  const [buying, setBuying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [eligibility, setEligibility] = useState<PresaleEligibility | null>(null);
  const HISTORY_PAGE_SIZE = 5;

  // Fetch presale stats (public)
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Fetch user's purchases + wallets
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchWallets();
    getMyPurchases()
      .then((d) => {
        setPurchases(d.purchases);
        setTotalTokens(d.totalTokens);
        setTotalSpent(d.totalSpent);
      })
      .catch(() => {});
    getPresaleEligibility().then(setEligibility).catch(() => {});
  }, [isAuthenticated, fetchWallets]);

  const price = parseFloat(stats?.price ?? '1');
  const MIN_USD = 5;
  const minTokens = price > 0 ? Math.ceil(MIN_USD / price) : 5;
  const inputAmount = parseFloat(tokenInput) || 0;
  const usdtCost = parseFloat((inputAmount * price).toFixed(2));
  const canBuy =
    inputAmount > 0 &&
    usdtCost >= MIN_USD &&
    usdtCost <= parseFloat(usdtBalance) &&
    !buying &&
    stats?.isActive;

  function handleBuy() {
    if (!canBuy) return;
    setConfirmOpen(true);
  }

  async function confirmBuy() {
    setConfirmOpen(false);
    setBuying(true);
    try {
      await buyTokens(tokenInput);
      toast.success(t('presale.buySuccess', { amount: inputAmount }));
      setTokenInput('');
      setHistoryPage(0);
      invalidate();
      fetchWallets();
      invalidatePresale();
      fetchStats();
      getMyPurchases()
        .then((d) => {
          setPurchases(d.purchases);
          setTotalTokens(d.totalTokens);
          setTotalSpent(d.totalSpent);
        })
        .catch(() => {});
      getPresaleEligibility().then(setEligibility).catch(() => {});
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Purchase failed';
      toast.error(msg);
    } finally {
      setBuying(false);
    }
  }

  // Derived stats — BE-served allocation is padded by FE_BONUS_ALLOCATION so
  // the public total reads 50M while BE only tracks 5M of real on-chain supply.
  const sold = parseFloat(stats?.totalSold ?? '0');
  const beAlloc = parseFloat(stats?.presaleAllocation ?? '5000000');
  const alloc = beAlloc + FE_BONUS_ALLOCATION;
  const remaining = Math.max(0, alloc - sold);
  const totalRaised = stats?.totalRaised ?? '0';
  const supply = parseFloat(stats?.totalSupply ?? '50000000');
  const pct = alloc > 0 ? Math.min((sold / alloc) * 100, 100) : 0;

  return (
    <div className="space-y-4">

      {/* Withdrawal eligibility banner */}
      {isAuthenticated && eligibility && (
        <div className={cn(
          'rounded-xl border px-4 py-3 flex items-center gap-3',
          eligibility.eligible
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-amber-500/30 bg-amber-500/5'
        )}>
          <div className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full',
            eligibility.eligible ? 'bg-emerald-500/20' : 'bg-amber-500/20'
          )}>
            <Coins className={cn('size-4', eligibility.eligible ? 'text-emerald-400' : 'text-amber-400')} />
          </div>
          <div className="flex-1 min-w-0">
            {eligibility.eligible ? (
              <>
                <p className="text-sm font-bold text-emerald-400">{t('presale.tokenRequirementMet')} ✓</p>
                <p className="text-[11px] text-muted-foreground">
                  {t('presale.purchasedPrefix')} <span className="font-bold text-foreground">{formatBalance(eligibility.totalTokens)}</span> <span className="font-bold text-cyan-400">$BURG</span>
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-amber-400">{t('presale.buyMinToUnlock', { amount: eligibility.requiredTokens })}</p>
                <p className="text-[11px] text-muted-foreground">
                  {t('presale.spentSoFar')}: <span className="font-bold text-foreground">{formatBalance(eligibility.totalTokens)} $BURG</span> · {t('presale.remainingLabel')}:{' '}
                  <span className="font-bold text-amber-400">{formatBalance(eligibility.remainingTokens)} $BURG</span>
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hero — Dashboard pattern */}
      <div className="card-operator relative overflow-hidden p-5 sm:p-6">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-2/3 -z-0 opacity-60"
          style={{
            background:
              'radial-gradient(ellipse 60% 80% at 90% 50%, color-mix(in oklab, var(--gold) 18%, transparent), transparent 70%)',
          }}
        />
        <div className="absolute right-4 top-4 z-10 hidden sm:inline-flex items-center gap-2">
          <span className="rounded-full bg-[color:var(--gold)]/15 border border-[color:var(--gold)]/40 px-2.5 py-0.5 text-[11px] font-extrabold text-[color:var(--gold)] tracking-wide font-mono">
            $BURG
          </span>
        </div>
        <div className="relative z-10">
          <p className="eyebrow text-[color:var(--gold)]">// TOKEN PRESALE</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter leading-none mt-2 pr-32">
            {t('presale.pageTitle')}
          </h1>
          <p className="editorial-quote mt-2">
            &ldquo;Stake the bun, ride the rise &mdash; $BURG presale live.&rdquo;
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-xl">
            {t('presale.pageSubtitle')}
          </p>
        </div>
      </div>

      {/* ── Block 1: Presale telemetry — wallet-tile stats + animated LED progress ── */}
      <div className="op-id-card">
        <div className="tx-cmdbar">
          <span className="tx-cmdbar-title">
            <Activity className="size-3.5" />
            Presale · Telemetry
          </span>
          <span className="tx-cmdbar-live">LIVE</span>
        </div>

        <div className="p-4 space-y-4">
          {/* 4-up wallet-tile stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: t('presale.price'),           value: `$${formatBalance(price)}`,                                                sub: t('presale.pricePerToken'),                                              icon: DollarSign,    variant: 'wallet-tile--cyan'   },
              { label: t('presale.tokensSold'),      value: fmtTokenCount(sold),                                                       sub: t('presale.tokensOf', { total: alloc.toLocaleString('en-US', { maximumFractionDigits: 0 }) }), icon: TrendingUp, variant: 'wallet-tile--violet' },
              { label: t('presale.remainingLabel'),  value: fmtTokenCount(remaining),                                                  sub: t('presale.tokensAvailable'),                                            icon: BarChart3,     variant: 'wallet-tile--gold'   },
              { label: t('presale.totalRaised'),     value: `$${formatBalance(totalRaised)}`,                                          sub: 'USDT',                                                                  icon: ShoppingCart,  variant: 'wallet-tile--mint'   },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className={cn('wallet-tile', s.variant)}>
                  <div className="wallet-tile-head">
                    <span className="wallet-tile-label">{s.label}</span>
                    <div className="wallet-tile-badge"><Icon className="size-3.5" /></div>
                  </div>
                  <p className="wallet-tile-amount">{s.value}</p>
                  <p className="wallet-tile-sub">{s.sub}</p>
                </div>
              );
            })}
          </div>

          {/* Animated LED progress bar — cyan variant of the trading wallet quota bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase text-cyan-200/80">
                {t('presale.presaleProgress')}
              </span>
              <span className="font-cyber text-[11px] font-extrabold tabular-nums tracking-wider text-cyan-300">
                {pct.toFixed(1)}%
              </span>
            </div>
            <div className="quota-bar-shell h-3">
              <div
                className="quota-bar-fill quota-bar-fill--cyan"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between font-mono text-[9.5px] tracking-[0.12em] text-muted-foreground">
              <span><span className="text-foreground/85 font-bold tabular-nums">{sold.toLocaleString()}</span> sold</span>
              <span>of <span className="text-foreground/85 font-bold tabular-nums">{alloc.toLocaleString()}</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Buy + My Tokens */}
      <div className="grid gap-4 sm:grid-cols-2">

        {/* ── Block 2: Purchase Terminal — tactical buy form ── */}
        <div className="op-id-card">
          <div className="tx-cmdbar">
            <span className="tx-cmdbar-title">
              <ShoppingCart className="size-3.5" />
              {t('presale.buyCardTitle')}
            </span>
            <span className="tx-cmdbar-live">TERMINAL</span>
          </div>

          <div className="p-4 space-y-3">
            {/* DW balance — cred-slot with insufficient-funds state switching to rose */}
            <div className={cn(
              'cred-slot',
              usdtCost > parseFloat(usdtBalance) && inputAmount > 0
                ? 'cred-slot--rose'
                : 'cred-slot--mint'
            )}>
              <div className="cred-badge">
                <Wallet className="size-4" />
              </div>
              <div className="cred-content">
                <span className="cred-label">{t('presale.depositWalletUsdt')}</span>
                <span className="cred-sub">{t('presale.usedForPurchase')}</span>
              </div>
              <span className="font-cyber text-lg font-extrabold tabular-nums"
                    style={{ color: 'inherit' }}>
                ${formatBalance(usdtBalance)}
              </span>
            </div>

            {/* Token Amount — JRENG punchy input slot with quick-pick chips */}
            <div className="space-y-2">
              <label
                htmlFor="presale-token-input"
                className="font-cyber text-[11px] font-extrabold tracking-[0.2em] uppercase text-cyan-300/95 flex items-center gap-1.5"
                style={{ textShadow: '0 0 8px rgba(103, 232, 249, 0.45)' }}
              >
                <span className="text-cyan-300">›</span> {t('presale.tokenAmount')}
                <span className="ml-1 font-mono text-[9px] tracking-[0.16em] text-cyan-200/65 font-normal normal-case">
                  · type to buy
                </span>
              </label>

              {/* Pulsing input slot — clearly a quantity entry field */}
              <label htmlFor="presale-token-input" className="jreng-shell">
                <span className="jreng-prefix">
                  <Coins className="size-3" /> AMT
                </span>
                <input
                  id="presale-token-input"
                  type="number"
                  min={minTokens}
                  step="1"
                  placeholder="0"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="jreng-input tabular-nums"
                  autoComplete="off"
                />
                <span className="jreng-suffix">$BURG</span>
              </label>

              {/* Quick-pick chips — instant amount entry */}
              <div className="space-y-1.5">
                <span className="block font-mono text-[9.5px] tracking-[0.16em] uppercase text-muted-foreground/70">
                  Quick:
                </span>
                <div className="grid grid-cols-5 gap-1.5">
                  {[minTokens, 25, 100, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTokenInput(String(amt))}
                      className="jreng-pick min-w-0"
                    >
                      {amt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const maxByBalance = Math.floor(parseFloat(usdtBalance) / price);
                      if (maxByBalance >= minTokens) setTokenInput(String(maxByBalance));
                    }}
                    className="jreng-pick min-w-0"
                    style={{ color: '#FCD34D', borderColor: 'rgba(252, 211, 77, 0.4)', background: 'rgba(252, 211, 77, 0.1)' }}
                  >
                    MAX
                  </button>
                </div>
              </div>

              <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground/85">
                {t('presale.minimumPurchase')}:{' '}
                <span className="font-bold text-cyan-300">${MIN_USD}</span>{' '}
                <span className="text-muted-foreground/65">({minTokens} $BURG)</span>
              </p>
            </div>

            {/* Cost preview — tactical telemetry block */}
            <div className="op-id-card !rounded-md">
              <div className="op-tel">
                <div className="op-tel-row">
                  <span className="op-tel-label">{t('presale.priceRow')}</span>
                  <span className="op-tel-value">${formatBalance(price)}</span>
                </div>
                <div className="op-tel-row">
                  <span className="op-tel-label">{t('presale.tokensRow')}</span>
                  <span className="op-tel-value">{inputAmount > 0 ? inputAmount.toLocaleString() : '—'}</span>
                </div>
                <div className="op-tel-row">
                  <span className="op-tel-label font-bold text-cyan-300/90">{t('presale.totalCost')}</span>
                  <span className="op-tel-value font-cyber text-[15px]"
                        style={{ color: '#67E8F9', textShadow: '0 0 10px rgba(34,211,238,0.5)' }}>
                    ${formatBalance(inputAmount > 0 ? usdtCost : 0)}
                  </span>
                </div>
                <div className="op-tel-row">
                  <span className="op-tel-label">{t('presale.afterPurchaseBalance')}</span>
                  <span className={cn(
                    'op-tel-value',
                    usdtCost > parseFloat(usdtBalance) && 'text-rose-400'
                  )}>
                    ${formatBalance(Math.max(0, parseFloat(usdtBalance) - usdtCost))}
                  </span>
                </div>
              </div>
              {usdtCost > parseFloat(usdtBalance) && inputAmount > 0 && (
                <p className="font-mono text-[10px] font-bold tracking-[0.14em] uppercase text-rose-400 px-3 py-2 border-t border-rose-500/25 bg-rose-500/8">
                  ⚠ {t('presale.insufficientBalance')}
                </p>
              )}
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={handleBuy}
                disabled={!canBuy}
                className="neon-btn neon-btn--jreng"
              >
                <Coins className={cn('size-4', buying && 'animate-spin')} />
                <span>{buying ? t('presale.buyingButton') : t('presale.buyButton')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Block 3: My Inventory — synthwave wallet tiles + ledger history ── */}
        <div className="op-id-card">
          <div className="tx-cmdbar">
            <span className="tx-cmdbar-title">
              <Coins className="size-3.5" />
              {t('presale.myTokensTitle')}
            </span>
            {purchases.length > 0 && (
              <span className="tx-cmdbar-live">{purchases.length} TX</span>
            )}
          </div>

          <div className="p-4 space-y-3">
            {/* 2-up wallet tiles — Tokens Owned (neon-sweep) + Total Spent (violet) */}
            <div className="grid grid-cols-2 gap-2">
              <div className="wallet-tile wallet-tile--cyan">
                <div className="wallet-tile-head">
                  <span className="wallet-tile-label">{t('presale.tokensOwned')}</span>
                  <div className="wallet-tile-badge"><Coins className="size-3.5" /></div>
                </div>
                <p className="neon-sweep wallet-tile-amount" style={{ background: undefined }}>
                  {parseFloat(totalTokens) > 0 ? formatBalance(totalTokens) : '0'}
                </p>
                <p className="wallet-tile-sub">$BURG · OWNED</p>
              </div>

              <div className="wallet-tile wallet-tile--violet">
                <div className="wallet-tile-head">
                  <span className="wallet-tile-label">{t('presale.totalSpent')}</span>
                  <div className="wallet-tile-badge"><DollarSign className="size-3.5" /></div>
                </div>
                <p className="wallet-tile-amount">
                  ${parseFloat(totalSpent) > 0 ? formatBalance(totalSpent) : '0'}
                </p>
                <p className="wallet-tile-sub">USDT · SPENT</p>
              </div>
            </div>

            {/* Purchase history — tactical ledger rows */}
            {(() => {
              const totalHistoryPages = Math.ceil(purchases.length / HISTORY_PAGE_SIZE);
              const pagedPurchases = purchases.slice(
                historyPage * HISTORY_PAGE_SIZE,
                (historyPage + 1) * HISTORY_PAGE_SIZE,
              );
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      <span className="text-cyan-300/80">›</span> {t('presale.purchaseHistory')}
                    </p>
                  </div>

                  {purchases.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <Receipt className="size-7 text-muted-foreground/40" />
                      <p className="font-mono text-[11px] tracking-wider text-muted-foreground/70">
                        {t('presale.noPurchases')}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        {pagedPurchases.map((p) => {
                          const d = new Date(p.createdAt);
                          return (
                            <div
                              key={p.id}
                              className="tx-block !rounded-md !py-2.5"
                              style={{ ['--rail' as never]: 'oklch(0.85 0.18 200)', ['--tx' as never]: 'oklch(0.85 0.18 200)' }}
                            >
                              <div className="tx-strip">
                                <span className="tx-chip">+$BURG</span>
                                <span className="tx-flow" aria-hidden />
                                <span className="tx-readout tx-readout--pos">
                                  +{formatBalance(p.tokenAmount)}
                                  <span className="tx-unit">BURG</span>
                                </span>
                              </div>
                              <div className="tx-foot">
                                <span className="tx-foot-time">
                                  {d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}{' '}
                                  {d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="tx-bal">
                                  <span className="tx-bal-label">COST</span>
                                  <span className="tx-bal-value">${formatBalance(p.usdtAmount)}</span>
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {totalHistoryPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-1">
                          <button
                            onClick={() => setHistoryPage(Math.max(0, historyPage - 1))}
                            disabled={historyPage === 0}
                            className="neon-btn neon-btn--cyan neon-btn--icon"
                            aria-label="Previous"
                          >
                            ←
                          </button>
                          <span className="font-mono text-[10px] tracking-widest text-muted-foreground tabular-nums">
                            {historyPage + 1} / {totalHistoryPages}
                          </span>
                          <button
                            onClick={() => setHistoryPage(Math.min(totalHistoryPages - 1, historyPage + 1))}
                            disabled={historyPage >= totalHistoryPages - 1}
                            className="neon-btn neon-btn--cyan neon-btn--icon"
                            aria-label="Next"
                          >
                            →
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Confirm purchase modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setConfirmOpen(false)}>
          <div className="bg-card border border-border rounded-xl p-5 w-80 space-y-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold text-center">{t('presale.confirmPurchaseTitle')}</p>
            <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-3 space-y-2 text-center">
              <p className="text-2xl font-extrabold text-cyan-400">{inputAmount.toLocaleString()} {t('presale.tokensRow').toLowerCase()}</p>
              <p className="text-xs text-muted-foreground">
                {t('presale.confirmAtPrice', { price: formatBalance(price) })}
              </p>
              <div className="border-t border-border/30 pt-2">
                <p className="text-[10px] text-muted-foreground">{t('presale.confirmTotalCost')}</p>
                <p className="text-lg font-extrabold text-foreground">${formatBalance(usdtCost)}</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
              {t('presale.confirmWarning')}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setConfirmOpen(false)}>
                {t('presale.cancel')}
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black font-bold"
                onClick={confirmBuy}
              >
                {t('presale.confirmBuy')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tokenomics — fresh tactical distribution panel ── */}
      <div className="op-id-card">
        <div className="tx-cmdbar">
          <span className="tx-cmdbar-title">
            <BarChart3 className="size-3.5" />
            {t('presale.tokenomics')} · Distribution
          </span>
          <span className="tx-cmdbar-live">10M $BURG</span>
        </div>

        <div className="p-4 space-y-4">
          {/* SPECTRUM BAR — single segmented bar with neon glow per tier */}
          <div className="tokenomics-bar">
            {TOKENOMICS.map((tier) => (
              <div
                key={tier.label}
                className={cn('tokenomics-bar-seg', tier.color)}
                style={{ width: `${tier.pct}%` }}
                title={`${tier.label} ${tier.pct}%`}
              />
            ))}
          </div>

          {/* TIER CHIPS — tactical clip-path tiles, one per tier */}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {TOKENOMICS.map((tier) => {
              const labelKey = `presale.tier${tier.label}` as const;
              return (
                <div
                  key={tier.label}
                  className={cn('tokenomics-tier', tier.color)}
                >
                  <span className={cn('tokenomics-tier-pct font-cyber', tier.text)}>
                    {tier.pct}%
                  </span>
                  <span className="tokenomics-tier-label">
                    {t(labelKey, tier.label)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* TELEMETRY FOOTER — supply + presale allocation as op-tel rows */}
          <div className="op-tel border-t border-border/30 pt-1">
            <div className="op-tel-row">
              <span className="op-tel-label">Supply · Total</span>
              <span className="op-tel-value">{supply.toLocaleString('en-US')} $BURG</span>
            </div>
            <div className="op-tel-row">
              <span className="op-tel-label">Presale · Allocation</span>
              <span className="op-tel-value">
                {alloc.toLocaleString('en-US')}{' '}
                <span className="text-cyan-300">
                  ({supply > 0 ? ((alloc / supply) * 100).toFixed(0) : 0}%)
                </span>{' '}
                <span className="text-muted-foreground">@ ${formatBalance(price)}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
