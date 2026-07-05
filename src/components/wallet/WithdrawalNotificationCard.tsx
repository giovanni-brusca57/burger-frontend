/**
 * Single mac-style notification card for an in-flight or recently-resolved withdrawal.
 *
 * Status-driven look:
 *  - PROCESSING / PENDING → amber spinner, live elapsed counter
 *  - COMPLETED → emerald check + tx hash link
 *  - FAILED → rose alert + "balance refunded" hint
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertCircle, Loader2, X, ExternalLink } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatBalance } from '@/lib/helpers';
import { useWithdrawalNotificationStore, type NotificationItem } from '@/stores/withdrawalNotifications.store';

interface Props {
  notification: NotificationItem;
}

function formatElapsed(fromIso: string): string {
  const elapsed = Math.max(0, Date.now() - new Date(fromIso).getTime());
  const totalSec = Math.floor(elapsed / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

function shortenAddress(addr: string, head = 6, tail = 4): string {
  if (addr.length <= head + tail) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function WithdrawalNotificationCard({ notification }: Props) {
  const { t } = useTranslation();
  const dismiss = useWithdrawalNotificationStore((s) => s.dismiss);

  const isInFlight = notification.status === 'PROCESSING' || notification.status === 'PENDING';
  const isSuccess = notification.status === 'COMPLETED';
  const isFailed = notification.status === 'FAILED';

  // Tick-update the elapsed timer once per second while in-flight
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isInFlight) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isInFlight]);

  const elapsed = isInFlight ? formatElapsed(notification.createdAt) : null;
  // Reference `now` so the elapsed string stays fresh (otherwise React won't re-render).
  void now;

  const containerClass = cn(
    'relative w-[320px] rounded-xl border bg-card/95 backdrop-blur-md shadow-2xl shadow-black/40 overflow-hidden',
    'animate-in fade-in slide-in-from-right-4 duration-300',
    isInFlight && 'border-amber-500/40',
    isSuccess && 'border-emerald-500/40',
    isFailed && 'border-rose-500/40',
  );

  const iconBoxClass = cn(
    'flex size-8 shrink-0 items-center justify-center rounded-lg',
    isInFlight && 'bg-amber-500/15 text-amber-400',
    isSuccess && 'bg-emerald-500/15 text-emerald-400',
    isFailed && 'bg-rose-500/15 text-rose-400',
  );

  const Icon = isInFlight ? Loader2 : isSuccess ? CheckCircle2 : AlertCircle;

  return (
    <div className={containerClass} role="status">
      <div className="flex items-start gap-2.5 p-3">
        <div className={iconBoxClass}>
          <Icon className={cn('size-4', isInFlight && 'animate-spin')} />
        </div>

        <div className="min-w-0 flex-1">
          {/* Title */}
          <p className="text-xs font-semibold leading-tight">
            {isInFlight && t('wallet.notif.processingTitle')}
            {isSuccess && t('wallet.notif.completedTitle')}
            {isFailed && t('wallet.notif.failedTitle')}
          </p>

          {/* Body — amount + address */}
          <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums leading-snug">
            {isSuccess
              ? `$${formatBalance(notification.netAmount)} → ${shortenAddress(notification.withdrawalAddress)}`
              : `$${formatBalance(notification.amount)} → ${shortenAddress(notification.withdrawalAddress)}`}
          </p>

          {/* Status detail line */}
          {isInFlight && (
            <p className="mt-1 text-[10px] text-amber-400/90 tabular-nums">
              {t('wallet.notif.processingHint', { elapsed })}
            </p>
          )}
          {isFailed && (
            <p className="mt-1 text-[10px] text-rose-400/90">
              {t('wallet.notif.failedHint')}
            </p>
          )}
          {isSuccess && notification.txHash && (
            <a
              href={`https://bscscan.com/tx/${notification.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-[10px] text-emerald-400/90 hover:text-emerald-300"
            >
              {t('wallet.notif.viewTx')}
              <ExternalLink className="size-2.5" />
            </a>
          )}
        </div>

        <button
          onClick={() => dismiss(notification.id)}
          aria-label={t('common.close')}
          className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
