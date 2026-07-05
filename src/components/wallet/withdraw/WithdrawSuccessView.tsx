import { useTranslation } from 'react-i18next';
import { CheckCircle2, ExternalLink } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatBalance } from '@/lib/helpers';
import type { WithdrawUsdtResponse } from '@/lib/wallet';

const BSC_EXPLORER =
  (import.meta.env.VITE_BSC_EXPLORER as string | undefined) ?? 'https://bscscan.com';

interface Props {
  open: boolean;
  result: WithdrawUsdtResponse;
  walletUnit: string;
  onClose: () => void;
}

/** USDT auto-withdraw success state — shown after the on-chain tx broadcasts. */
export function WithdrawSuccessView({ open, result, walletUnit, onClose }: Props) {
  const { t } = useTranslation();
  const shortAddr = `${result.withdrawalAddress.slice(0, 6)}…${result.withdrawalAddress.slice(-4)}`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="default" className="gap-5">
        <DialogHeader>
          <DialogTitle>{t('wallet.withdrawCompleteTitle')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-2">
          <CheckCircle2 className="size-12 text-emerald-400" />
          <p className="text-sm font-semibold text-center">
            {t('wallet.withdrawCompleteDesc', {
              amount: formatBalance(result.netAmount),
              unit: walletUnit,
              address: shortAddr,
            })}
          </p>

          <div className="w-full rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t('wallet.withdrawTxHashLabel')}
            </p>
            <p className="text-[11px] font-mono break-all text-foreground/90">{result.txHash}</p>
            <a
              href={`${BSC_EXPLORER}/tx/${result.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80"
            >
              {t('wallet.withdrawViewBscScan')}
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>

        <Button variant="outline" className="min-w-[90%] mx-auto" onClick={onClose}>
          {t('common.close')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
