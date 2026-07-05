import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function DepositModal({
  open,
  onOpenChange,
  bep20Address,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bep20Address: string;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bep20Address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('wallet.copyError'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="default" className="gap-4">
        <DialogHeader>
          <DialogTitle>{t('wallet.deposit')}</DialogTitle>
        </DialogHeader>

        {/* Warning */}
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3.5 py-3 text-xs text-blue-400 leading-relaxed">
          {t('wallet.depositWarning')}
        </div>

        {/* Body: left (currency + address) + right (QR) */}
        <div className="flex gap-5">
          <div className="flex-1 min-w-0 space-y-4">
            {/* Deposit Currency */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                {t('wallet.depositCurrency')}
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-teal-400 text-[10px] font-bold">
                  T
                </span>
                <span className="text-sm font-medium">USDT (BEP-20)</span>
              </div>
            </div>

            {/* Deposit Address */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                {t('wallet.depositAddress')}
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <p className="flex-1 min-w-0 text-xs font-mono text-foreground/80 break-all">
                  {bep20Address}
                </p>
                <button
                  onClick={handleCopy}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Copy address"
                >
                  {copied ? (
                    <Check className="size-4 text-emerald-500" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* QR Code — desktop */}
          {bep20Address && (
            <div className="hidden sm:flex shrink-0 items-center justify-center self-center">
              <div className="rounded-lg bg-white p-2">
                <QRCodeSVG value={bep20Address} size={120} bgColor="#ffffff" fgColor="#000000" />
              </div>
            </div>
          )}
        </div>

        {/* QR Code — mobile */}
        {bep20Address && (
          <div className="flex sm:hidden justify-center pt-1">
            <div className="rounded-lg bg-white p-2">
              <QRCodeSVG value={bep20Address} size={148} bgColor="#ffffff" fgColor="#000000" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
