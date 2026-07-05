import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatRemaining } from '@/lib/withdraw-intent';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Seconds remaining on the active OTP — drives the "valid for X" message. */
  expirySec: number;
  /** Confirm "discard withdrawal" — clear intent + reset + close parent modal. */
  onDiscard: () => void;
}

/** Soft-close confirmation shown when the user tries to dismiss the modal while an OTP is pending. */
export function WithdrawCloseConfirm({ open, onOpenChange, expirySec, onDiscard }: Props) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card border-border/80 shadow-2xl shadow-black/60">
        <AlertDialogHeader>
          <div className="mx-auto mb-1 flex size-12 items-center justify-center rounded-full ring-4 ring-amber-500/30 bg-amber-500/10">
            <Clock className="size-6 text-amber-400" />
          </div>
          <AlertDialogTitle className="text-center">
            {t('wallet.withdrawCloseConfirmTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {t('wallet.withdrawCloseConfirmDesc', { time: formatRemaining(expirySec) })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            {t('wallet.withdrawCloseKeepWaiting')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              onDiscard();
            }}
          >
            {t('wallet.withdrawCloseDiscard')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
