import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Network } from 'lucide-react';

import { useAuthStore } from '@/stores/auth.store';
import { useWalletStore } from '@/stores/wallet.store';
import { getJackpotStatus, type JackpotStatus } from '@/lib/jackpot';
import { getMevWallet } from '@/lib/mev';
import { NetworkTreeView } from '@/components/network/NetworkTreeView';
import { StatusBadge } from '@/components/dashboard/StatusBadge';

import { ProfileBanner } from '@/components/portfolio/ProfileBanner';
import { AccountCard } from '@/components/portfolio/AccountCard';
import { WalletsCard } from '@/components/portfolio/WalletsCard';
import { NetworkStatusCard } from '@/components/portfolio/NetworkStatusCard';
import { AttemptsCard } from '@/components/portfolio/AttemptsCard';

export default function PortfolioPage() {
  const { t } = useTranslation();
  const { user, isAuthenticated, profile, fetchProfile } = useAuthStore();
  const { wallets, fetchWallets, profitSummary, fetchProfitSummary } = useWalletStore();
  const [jackpotStatus, setJackpotStatus] = useState<JackpotStatus | null>(null);
  const [mevAttempts, setMevAttempts] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWallets();
      fetchProfile();
      fetchProfitSummary();
      // Lucky Break attempt — derived from /jackpot/status (eligible && !isSpun).
      // BE eligibility rule: ≥1 referral in prev period with TRADING ≥ $30.
      getJackpotStatus().then(setJackpotStatus).catch(() => {});
      // Burger Bot attempts — sourced from /mev/wallet (MEV module's own data).
      // 404/403 falls through to 0 if the user happens to have no MEV wallet
      // (shouldn't occur in practice — registration creates one for everyone).
      getMevWallet()
        .then((w) => setMevAttempts(w.mevAttempts ?? 0))
        .catch(() => setMevAttempts(0));
    }
  }, [isAuthenticated, fetchWallets, fetchProfile, fetchProfitSummary]);

  const usdtBalance             = wallets.find((w) => w.apiType === 'USDT')?.balance ?? '0';
  const tradingBalance          = wallets.find((w) => w.apiType === 'TRADING')?.balance ?? '0';
  const networkProfitBalance    = wallets.find((w) => w.apiType === 'PROFIT_NETWORK')?.balance ?? '0';
  const investmentProfitBalance = wallets.find((w) => w.apiType === 'PROFIT_INVESTMENT')?.balance ?? '0';

  // 1 attempt only when BE marks the user eligible AND today's spin hasn't been used.
  const luckyBreakAttempts =
    jackpotStatus?.eligible && !jackpotStatus?.isSpun ? 1 : 0;

  return (
    <div className="space-y-8">
      {/* Hero — Dashboard-pattern header */}
      <div className="card-operator relative overflow-hidden p-5 sm:p-6">
        <div className="absolute right-4 top-4 z-10 hidden sm:inline-flex">
          <StatusBadge variant="active" animated>
            {t('dashboard.active')}
          </StatusBadge>
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-2/3 -z-0 opacity-60"
          style={{
            background:
              'radial-gradient(ellipse 60% 80% at 90% 50%, color-mix(in oklab, var(--success) 16%, transparent), transparent 70%)',
          }}
        />
        <div className="relative z-10">
          <p className="eyebrow text-[color:var(--success)]">// PORTFOLIO</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter leading-none mt-2 pr-24">
            {t('portfolio.pageTitle')}
          </h1>
          <p className="editorial-quote mt-2">
            &ldquo;Your stack, at a glance &mdash; every position, every play.&rdquo;
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-xl">
            {t('portfolio.pageSubtitle')}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileBanner user={user} />
        <AccountCard user={user} />
      </div>

      <WalletsCard
        usdtBalance={usdtBalance}
        tradingBalance={tradingBalance}
        investmentProfitBalance={investmentProfitBalance}
        networkProfitBalance={networkProfitBalance}
        profitSummary={profitSummary}
      />

      <NetworkStatusCard profile={profile} />

      <AttemptsCard mevAttempts={mevAttempts} luckyBreakAttempts={luckyBreakAttempts} />

      <div className="op-id-card">
        <div className="tx-cmdbar">
          <span className="tx-cmdbar-title">
            <Network className="size-3.5" />
            {t('portfolio.networkTreeSection')}
          </span>
          <span className="tx-cmdbar-live">LIVE</span>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-[11px] text-muted-foreground font-mono tracking-wider">
            {t('portfolio.networkTreeDesc')}
          </p>
          <NetworkTreeView />
        </div>
      </div>
    </div>
  );
}
