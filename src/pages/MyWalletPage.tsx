import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useAuthStore } from '@/stores/auth.store';
import { useWalletStore, selectCurrentTxData } from '@/stores/wallet.store';
import { useFeatureFlagsStore } from '@/stores/featureFlags.store';
import { useWithdrawalNotificationStore } from '@/stores/withdrawalNotifications.store';
import { type Wallet } from '@/components/wallet/wallet.types';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { WalletAssets } from '@/components/wallet/WalletAssets';
import { WalletHistory } from '@/components/wallet/WalletHistory';
import { DepositModal } from '@/components/wallet/DepositModal';
import { SubmitDepositModal } from '@/components/wallet/SubmitDepositModal';
import { InternalTransferModal } from '@/components/wallet/InternalTransferModal';
import { WithdrawModal } from '@/components/wallet/WithdrawModal';

export default function MyWalletPage() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuthStore();
  const {
    wallets,
    loadingWallets,
    fetchWallets,
    profitSummary,
    fetchProfitSummary,
    loadingTx,
    txPage,
    txTotal,
    pageSize,
    fetchTx,
    setTxPage: storSetTxPage,
    txRateLimitedUntil,
    invalidate,
  } = useWalletStore();

  const transactions = useWalletStore(selectCurrentTxData);

  // Modal state
  const [depositWallet, setDepositWallet] = useState<Wallet | null>(null);
  const [internalTransferWallet, setInternalTransferWallet] = useState<Wallet | null>(null);
  const [withdrawWallet, setWithdrawWallet] = useState<Wallet | null>(null);
  const [submitWallet, setSubmitWallet] = useState<Wallet | null>(null);
  const [reinvestWallet, setReinvestWallet] = useState<Wallet | null>(null);
  // reinvestWallet opens InternalTransferModal pre-set to TRADING destination

  useEffect(() => {
    if (isAuthenticated) {
      fetchWallets();
      fetchProfitSummary();
      fetchTx(0);
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // BE now embeds the withdrawal record on each WITHDRAWAL transaction row,
  // so we no longer need a separate /wallet/withdrawals fetch on this page.
  // The withdrawalNotifications store still polls /wallet/withdrawals on its
  // own (every 5s) for floating in-flight notifications. When a status flips,
  // refetch the current tx page so the embedded `withdrawal.status` updates.
  const withdrawalNotifs = useWithdrawalNotificationStore((s) => s.notifications);
  useEffect(() => {
    if (withdrawalNotifs.length === 0) return;
    fetchTx(txPage, { force: true });
  }, [withdrawalNotifs, fetchTx, txPage]);

  const refreshAll = () => {
    invalidate();
    fetchWallets();
    fetchProfitSummary();
    fetchTx(0);
  };

  // Action-level maintenance gates — admins still see the toast (rather than
  // bypass) so they can verify the locked-out UX.
  const isEnabled = useFeatureFlagsStore((s) => s.isEnabled);
  const getFlag = useFeatureFlagsStore((s) => s.getFlag);

  function gated(flag: 'deposits' | 'withdrawals' | 'internal_transfers', open: () => void) {
    if (isEnabled(flag)) {
      open();
      return;
    }
    const note = getFlag(flag)?.message;
    toast.error(t(`wallet.maintenance.${flag}`), {
      description: note ?? t('wallet.maintenance.defaultDesc'),
    });
  }

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
              'radial-gradient(ellipse 60% 80% at 90% 50%, color-mix(in oklab, var(--info) 18%, transparent), transparent 70%)',
          }}
        />
        <div className="relative z-10">
          <p className="eyebrow text-[color:var(--info)]">// WALLET</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter leading-none mt-2 pr-24">
            {t('wallet.title')}
          </h1>
          <p className="editorial-quote mt-2">
            &ldquo;Stack profits, sweep the floor &mdash; every wallet move accounted for.&rdquo;
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-xl">
            {t('wallet.subtitle')}
          </p>
        </div>
      </div>

      <WalletAssets
        wallets={wallets}
        loading={loadingWallets}
        profitSummary={profitSummary}
        onDeposit={(w) => gated('deposits', () => setDepositWallet(w))}
        onInternalTransfer={(w) => gated('internal_transfers', () => setInternalTransferWallet(w))}
        onWithdraw={(w) => gated('withdrawals', () => setWithdrawWallet(w))}
        onSubmit={(w) => gated('deposits', () => setSubmitWallet(w))}
        onReinvest={(w) => {
          // "Reinvest" semantics = "add into TRADING from another wallet". If
          // the user clicked Reinvest from the Trading Wallet card itself,
          // pivot the source to USDT (Deposit Wallet) so source != destination
          // — otherwise the modal opens with TRADING → TRADING which is invalid.
          const source = w.apiType === 'TRADING'
            ? wallets.find((x) => x.apiType === 'USDT') ?? w
            : w;
          gated('internal_transfers', () => setReinvestWallet(source));
        }}
      />

      <WalletHistory
        transactions={transactions}
        loading={loadingTx}
        total={txTotal}
        page={txPage}
        pageSize={pageSize}
        onPageChange={storSetTxPage}
        rateLimitedUntil={txRateLimitedUntil}
        onRefresh={() => {
          // Refresh button refreshes everything on the page (wallets, profit
          // summary, current tx page). invalidate() clears the staleness cache
          // so the next tx fetch hits the network.
          invalidate();
          fetchWallets();
          fetchProfitSummary();
          fetchTx(txPage, { force: true });
        }}
      />

      <DepositModal
        open={depositWallet !== null}
        onOpenChange={(v) => !v && setDepositWallet(null)}
        bep20Address={user?.walletAddress ?? ''}
      />
      <SubmitDepositModal
        open={submitWallet !== null}
        onOpenChange={(v) => !v && setSubmitWallet(null)}
        onDepositSubmitted={refreshAll}
      />
      {/* Normal send modal */}
      <InternalTransferModal
        open={internalTransferWallet !== null}
        onOpenChange={(v) => !v && setInternalTransferWallet(null)}
        wallet={internalTransferWallet}
        allWallets={wallets}
        onSuccess={refreshAll}
      />
      {/* Reinvest = send to Trading Wallet (pre-selected) */}
      <InternalTransferModal
        open={reinvestWallet !== null}
        onOpenChange={(v) => !v && setReinvestWallet(null)}
        wallet={reinvestWallet}
        allWallets={wallets}
        onSuccess={refreshAll}
        defaultToType="TRADING"
      />
      <WithdrawModal
        open={withdrawWallet !== null}
        onOpenChange={(v) => {
          if (!v) {
            setWithdrawWallet(null);
            refreshAll();
          }
        }}
        wallet={withdrawWallet}
        onSuccess={refreshAll}
        /* Note: user.walletAddress = DEPOSIT address (different from withdrawal).
           User must enter their own external BEP20 address for withdrawal. */
      />
    </div>
  );
}
