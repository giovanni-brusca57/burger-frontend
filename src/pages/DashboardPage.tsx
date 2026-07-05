import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useAuthStore } from '@/stores/auth.store';
import { useWalletStore } from '@/stores/wallet.store';
import { usePresaleStore } from '@/stores/presale.store';
import {
  getRecentTradingProfit,
  type TradingProfitRecentEntry,
} from '@/lib/tradingProfit';
import { getGlobalPool, type GlobalPoolStat } from '@/lib/deposit';

import { BurgerEngineCard } from '@/components/dashboard/BurgerEngineCard';
import { InvestmentCard } from '@/components/dashboard/InvestmentCard';
import { ProfitWalletsCard } from '@/components/dashboard/ProfitWalletsCard';
import { MevPoolCard } from '@/components/dashboard/MevPoolCard';
import { PresaleBanner } from '@/components/dashboard/PresaleBanner';
import { ReferralCard } from '@/components/dashboard/ReferralCard';
import { NetworkRankSection } from '@/components/dashboard/NetworkRankSection';
import { StatusBadge } from '@/components/dashboard/StatusBadge';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user, isAuthenticated, profile, fetchProfile } = useAuthStore();
  const { wallets, fetchWallets, loadingWallets, profitSummary, fetchProfitSummary } = useWalletStore();
  const { stats: presale, fetchStats: fetchPresaleStats } = usePresaleStore();

  const [copied, setCopied] = useState(false);
  const [recentBatches, setRecentBatches] = useState<TradingProfitRecentEntry[]>([]);
  const [globalPool, setGlobalPool] = useState<GlobalPoolStat | null>(null);

  useEffect(() => {
    fetchPresaleStats();
    const ac = new AbortController();
    getGlobalPool(ac.signal).then(setGlobalPool).catch(() => {});
    return () => ac.abort();
  }, [fetchPresaleStats]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWallets();
      fetchProfile();
      fetchProfitSummary();
      getRecentTradingProfit(6).then(setRecentBatches).catch(() => {});
    }
  }, [isAuthenticated, fetchWallets, fetchProfile, fetchProfitSummary]);

  const tradingBalance          = wallets.find((w) => w.apiType === 'TRADING')?.balance ?? '0';
  const networkProfitBalance    = wallets.find((w) => w.apiType === 'PROFIT_NETWORK')?.balance ?? '0';
  const investmentProfitBalance = wallets.find((w) => w.apiType === 'PROFIT_INVESTMENT')?.balance ?? '0';

  const referralLink = user?.walletAddress
    ? `${import.meta.env.VITE_BASE_URL || window.location.origin}?ref=${user.walletAddress}`
    : '';

  function copyReferralLink() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      toast.success(t('dashboard.referralCopied'));
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-8">
      <div className="card-operator relative overflow-hidden p-5 sm:p-6">
        {/* Abstract fluid art — right side, behind content. Pointer-events disabled. */}
        <img
          src="/bg-fluid-orange.svg"
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none select-none absolute inset-y-0 right-0 h-full w-[78%] md:w-[62%] lg:w-[55%] object-cover object-right opacity-90 z-0"
        />

        {/* Blueprint grid overlay — subtle depth, fades toward bottom-right */}
        <div className="hero-grid-overlay z-0" aria-hidden />

        {/* ACTIVE badge — anchored to top-right corner of the card */}
        <div className="absolute right-4 top-4 z-10 hidden sm:inline-flex">
          <StatusBadge variant="active" animated>
            {t('dashboard.active')}
          </StatusBadge>
        </div>

        <div className="relative z-10">
        <h1 className="hero-title-gradient text-3xl md:text-4xl font-bold tracking-tighter leading-none pr-24">
          {t('dashboard.title')}
        </h1>

        {/* Pull-quote (left) + 5 strategy icons (right on lg+) */}
        <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-10">
          <p className="editorial-quote lg:flex-1">
            &ldquo;Sandwich the mempool, add LP, hunt memes, stake the floor, hold the alts &mdash; five plays, every batch.&rdquo;
          </p>

          <div className="stagger-in flex flex-wrap items-start gap-x-6 gap-y-4 sm:gap-x-7 lg:shrink-0">
            {[
              { src: '/strat-sandwich-v2.svg', label: 'Sandwich',     color: 'text-[color:var(--info)]'    },
              { src: '/strat-addlp-v2.svg',    label: 'Add LP',       color: 'text-[color:var(--success)]' },
              { src: '/strat-meme-v2.svg',     label: 'Meme Trading', color: 'text-[#FF2BD6]'              },
              { src: '/strat-staking-v2.svg',  label: 'Staking',      color: 'text-[#FACC15]'              },
              { src: '/strat-altcoin-v2.svg',  label: 'Altcoin Hold', color: 'text-[#A35BFF]'              },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1.5">
                <img
                  src={s.src}
                  alt=""
                  aria-hidden
                  className="h-14 w-[4.667rem] sm:h-16 sm:w-[5.333rem]"
                  draggable={false}
                />
                <span className={`font-cyber text-[10px] uppercase tracking-[0.14em] ${s.color}`}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Telemetry strip — static platform stats along the hero base */}
        <div className="hero-telemetry">
          <span className="hero-telemetry-item hero-telemetry-item--cyan">
            <span className="hero-telemetry-value">0.8–2%</span>
            {t('dashboard.telemetryYield')}
          </span>
          <span className="hero-telemetry-item hero-telemetry-item--violet">
            <span className="hero-telemetry-value">24/7</span>
            {t('dashboard.telemetryAutomated')}
          </span>
        </div>
        </div>
      </div>

      <div className="stagger-in grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MevPoolCard
          mevPool={globalPool?.totalInvested ?? '0'}
          recentBatches={recentBatches.map((b, i) => ({
            // index used as key fallback — the BE response is per-record so no stable id is needed here.
            batchNumber: i,
            percentage: b.profitRate.replace('%', '').trim(),
            createdAt: b.createdAt,
          }))}
        />
        <BurgerEngineCard />
        <InvestmentCard
          tradingBalance={tradingBalance}
          loadingWallets={loadingWallets}
          isAuthenticated={isAuthenticated}
          profitSummary={profitSummary}
        />
        <ProfitWalletsCard
          investmentProfitBalance={investmentProfitBalance}
          networkProfitBalance={networkProfitBalance}
          loadingWallets={loadingWallets}
          isAuthenticated={isAuthenticated}
        />
      </div>

      {presale?.isActive && <PresaleBanner presale={presale} />}

      <div className="grid gap-5 lg:grid-cols-4">
        <ReferralCard
          user={user}
          isAuthenticated={isAuthenticated}
          profile={profile}
          referralLink={referralLink}
          copied={copied}
          onCopy={copyReferralLink}
        />
        <NetworkRankSection
          user={user}
          isAuthenticated={isAuthenticated}
          profile={profile}
        />
      </div>
    </div>
  );
}
