import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, CheckCircle2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type Wallet } from './wallet.types';
import { fmtAmount } from '@/lib/wallet';

const AMOUNT_RE = /^\d+(\.\d{1,6})?$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function TransferModal({
  open,
  onOpenChange,
  wallet,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  wallet: Wallet | null;
}) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const numAmount = parseFloat(amount) || 0;
  const isValidAmount = AMOUNT_RE.test(amount) && numAmount > 0;
  const isValidEmail = EMAIL_RE.test(email);
  const canSubmit = isValidAmount && isValidEmail && !isLoading;

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setAmount('');
      setEmail('');
      setSucceeded(false);
    }
    onOpenChange(v);
  };

  const handleTransfer = async () => {
    if (!wallet || !canSubmit) return;
    setIsLoading(true);
    try {
      // P2P transfer endpoint removed from BE — this modal is kept for reference only
      throw new Error('Transfer not available');
    } catch (err: any) {
      toast.error(err?.message ?? t('wallet.transferErrorGeneric'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!wallet) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="default" className="gap-5">
        <DialogHeader>
          <DialogTitle>{t('wallet.transferTitle')}</DialogTitle>
        </DialogHeader>

        {succeeded ? (
          <div className="flex flex-col items-center justify-center gap-3 py-6">
            <CheckCircle2 className="size-12 text-green-500" />
            <p className="text-sm font-semibold">{t('wallet.transferSuccess')}</p>
            <p className="text-xs text-muted-foreground text-center">
              {t('wallet.transferSuccessDesc', {
                amount,
                unit: wallet.unit,
                email,
              })}
            </p>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => handleOpenChange(false)}
            >
              {t('common.close')}
            </Button>
          </div>
        ) : (
          <>
            {/* Wallet row */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                {t('wallet.transferTransaction')}
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                    wallet.color
                  )}
                >
                  {wallet.unit.slice(0, 2)}
                </span>
                <span className="text-sm font-medium">{wallet.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {t('wallet.transferAvailableBalance', {
                    amount: fmtAmount(wallet.balance),
                    unit: wallet.unit,
                  })}
                </span>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                {t('wallet.transferAmount')}
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t('wallet.transferAmountPlaceholder', {
                    amount: '0.0000',
                    unit: wallet.unit,
                  })}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                />
                <button
                  type="button"
                  onClick={() => setAmount(wallet.balance)}
                  className="text-xs font-semibold text-primary hover:text-primary/80"
                >
                  {t('wallet.transferAll')}
                </button>
              </div>
            </div>

            {/* Recipient email */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                {t('wallet.transferRecipientEmail')}
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('wallet.transferRecipientPlaceholder')}
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-ring"
              />
            </div>

            {/* Summary */}
            <p className="text-center text-xs text-muted-foreground">
              {t('wallet.transferAmountToReceive', {
                amount: fmtAmount(numAmount),
                unit: wallet.unit,
              })}
            </p>

            <Button
              className="min-w-[93%] gap-2"
              disabled={!canSubmit}
              onClick={handleTransfer}
            >
              {isLoading && <Loader2 className="size-4 animate-spin" />}
              {isLoading ? t('wallet.transferring') : t('common.confirm')}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
