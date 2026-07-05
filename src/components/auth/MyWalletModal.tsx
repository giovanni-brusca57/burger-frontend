import { useState, useCallback, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Link2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { useAuthModalStore } from '@/stores/auth-modal.store';
import { useAuthStore } from '@/stores/auth.store';
import { useWalletStore } from '@/stores/wallet.store';
import { fmtAmount } from '@/lib/wallet';
import { type Wallet } from '@/components/wallet/wallet.types';
import { DepositModal } from '@/components/wallet/DepositModal';
import { SubmitDepositModal } from '@/components/wallet/SubmitDepositModal';
import { InternalTransferModal } from '@/components/wallet/InternalTransferModal';

// ---------------------------------------------------------------------------
// Wallet row
// ---------------------------------------------------------------------------

const WalletRow = memo(function WalletRow({
  wallet,
  onDeposit,
  onSubmit,
  onTransfer,
  onInternalTransfer,
}: {
  wallet: Wallet;
  onDeposit: () => void;
  onSubmit: () => void;
  onTransfer: () => void;
  onInternalTransfer: () => void;
}) {
  const { t } = useTranslation();
  const hasDeposit = wallet.actions.includes('deposit');
  const hasSubmit = wallet.actions.includes('submit');
  const hasTransfer = wallet.actions.includes('transfer');
  const hasInternalTransfer = wallet.actions.includes('internal-transfer');

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              'flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
              wallet.color
            )}
          >
            {wallet.unit.charAt(0)}
          </span>
          <span className="text-xs text-muted-foreground truncate">{wallet.name}</span>
        </div>
        <span className="text-xs font-medium tabular-nums shrink-0">
          {fmtAmount(wallet.balance)} {wallet.unit}
        </span>
      </div>
      {(hasDeposit || hasSubmit || hasTransfer || hasInternalTransfer) && (
        <div className="flex flex-wrap gap-1.5 pl-7">
          {hasDeposit && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2.5 text-[11px]"
              onClick={onDeposit}
            >
              {t('wallet.deposit')}
            </Button>
          )}
          {hasSubmit && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2.5 text-[11px]"
              onClick={onSubmit}
            >
              {t('wallet.submitTx')}
            </Button>
          )}
          {hasTransfer && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2.5 text-[11px]"
              onClick={onTransfer}
            >
              {t('wallet.transfer')}
            </Button>
          )}
          {hasInternalTransfer && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2.5 text-[11px] border-amber-500/50 text-amber-500 hover:bg-amber-500/10 hover:text-amber-500"
              onClick={onInternalTransfer}
            >
              {t('wallet.internalTransfer')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// MyWalletModal — authenticated wallet view
// ---------------------------------------------------------------------------

export function MyWalletModal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { open, hide } = useAuthModalStore();
  const { user, logout } = useAuthStore();
  const { wallets, loadingWallets: loading, fetchWallets, invalidate } = useWalletStore();

  const [depositOpen, setDepositOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [internalTransferWallet, setInternalTransferWallet] = useState<Wallet | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);

  const refreshWallets = useCallback(() => {
    invalidate();
    fetchWallets();
  }, [invalidate, fetchWallets]);

  useEffect(() => {
    if (open) fetchWallets();
  }, [open, fetchWallets]);

  const handleCopyLink = useCallback(async () => {
    if (!user?.walletAddress) return;
    const link = `${import.meta.env.VITE_BASE_URL || window.location.origin}?ref=${encodeURIComponent(user.walletAddress)}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error(t('profile.copyError'));
    }
  }, [user?.walletAddress, t]);

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && hide()}>
        <DialogContent size="sm" className="p-0 gap-0 flex flex-col max-h-[90dvh]">
          {/* Header */}
          <div className="px-5 pt-5 pb-4 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-sm text-primary-foreground">
                M
              </div>
              <DialogTitle>{t('auth.myWallet')}</DialogTitle>
            </div>
            <DialogDescription className="mt-1">
              {t('auth.connectedTo')}
            </DialogDescription>
          </div>

          {/* Scrollable middle content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {/* Wallet balances */}
            <div className="border-t border-border/60 px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {t('wallet.assetsTitle')}
                </p>
                <button
                  onClick={refreshWallets}
                  disabled={loading}
                  className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  aria-label="Refresh"
                >
                  <RefreshCw className={cn('size-3', loading && 'animate-spin')} />
                </button>
              </div>

              {loading && wallets.length === 0 ? (
                <div className="flex items-center justify-center py-4 text-muted-foreground gap-2">
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span className="text-xs">{t('common.loading')}</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {wallets.map((wallet) => (
                    <WalletRow
                      key={wallet.id}
                      wallet={wallet}
                      onDeposit={() => setDepositOpen(true)}
                      onSubmit={() => setSubmitOpen(true)}
                      onTransfer={() => {}}
                      onInternalTransfer={() => setInternalTransferWallet(wallet)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Referral */}
            <div className="border-t border-border/60 px-5 py-4 space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t('auth.yourReferral')}
              </p>

              <code className="block w-full truncate rounded-lg border border-border/60 bg-muted px-3 py-2 text-xs font-mono">
                {user?.walletAddress}
              </code>

              <Button
                variant="outline"
                size="sm"
                className="min-w-[95%] h-8 gap-1.5 text-xs"
                onClick={handleCopyLink}
              >
                {copiedLink ? (
                  <Check className="size-3.5 text-green-500" />
                ) : (
                  <Link2 className="size-3.5" />
                )}
                {copiedLink ? t('auth.linkCopied') : t('auth.copyInviteLink')}
              </Button>

              <p className="text-[11px] text-muted-foreground">
                {t('auth.shareDescription')}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border/60 px-5 py-4 grid grid-cols-2 gap-2 shrink-0">
            <Button variant="outline" onClick={hide}>
              {t('auth.close')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                logout();
                hide();
                // Reset the URL so the next login starts clean instead of
                // re-opening the last-visited page (login is a modal, not a route).
                navigate('/dashboard', { replace: true });
              }}
            >
              {t('nav.logout')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DepositModal
        open={depositOpen}
        onOpenChange={(v) => setDepositOpen(v)}
        bep20Address={user?.walletAddress ?? ''}
      />
      <SubmitDepositModal
        open={submitOpen}
        onOpenChange={(v) => setSubmitOpen(v)}
        onDepositSubmitted={refreshWallets}
      />
      <InternalTransferModal
        open={internalTransferWallet !== null}
        onOpenChange={(v) => !v && setInternalTransferWallet(null)}
        wallet={internalTransferWallet}
        allWallets={wallets}
        onSuccess={refreshWallets}
      />
    </>
  );
}
