import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownToLine, ArrowUpFromLine, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { formatBalance } from '@/lib/helpers';
import { weiToUsdt } from '@/lib/deposit';
import {
  getUserDeposits,
  getUserWithdrawals,
  type AdminDepositEntry,
  type AdminWithdrawalEntry,
} from '@/lib/admin';

const LIMIT = 10;

interface Props {
  userId: string;
}

function StatusBadge({ status }: { status: string }) {
  const color = (() => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'FAILED':
        return 'bg-rose-500/10 border-rose-500/30 text-rose-400';
      case 'PROCESSING':
      case 'PENDING':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      default:
        return 'bg-muted/30 border-border/30 text-muted-foreground';
    }
  })();
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide leading-none',
        color,
      )}
    >
      {status}
    </span>
  );
}

function shortHash(hash?: string | null) {
  if (!hash) return '—';
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

function bscscanLink(hash: string) {
  return `https://bscscan.com/tx/${hash}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function UserHistorySection({ userId }: Props) {
  const { t } = useTranslation();
  const [deposits, setDeposits] = useState<AdminDepositEntry[]>([]);
  const [depositsTotal, setDepositsTotal] = useState(0);
  const [loadingDeposits, setLoadingDeposits] = useState(false);
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawalEntry[]>([]);
  const [withdrawalsTotal, setWithdrawalsTotal] = useState(0);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const ac = new AbortController();

    setLoadingDeposits(true);
    getUserDeposits(userId, { limit: LIMIT }, ac.signal)
      .then((r) => {
        setDeposits(r.data ?? []);
        setDepositsTotal(r.total ?? 0);
      })
      .catch((err: any) => {
        // Treat 404 as "endpoint not deployed yet" — render empty state silently.
        if (err?.status && err.status !== 404 && err?.message !== 'canceled') {
          toast.error(err?.message ?? 'Failed to load deposit history.');
        }
      })
      .finally(() => setLoadingDeposits(false));

    setLoadingWithdrawals(true);
    getUserWithdrawals(userId, { limit: LIMIT }, ac.signal)
      .then((r) => {
        setWithdrawals(r.data ?? []);
        setWithdrawalsTotal(r.total ?? 0);
      })
      .catch((err: any) => {
        if (err?.status && err.status !== 404 && err?.message !== 'canceled') {
          toast.error(err?.message ?? 'Failed to load withdrawal history.');
        }
      })
      .finally(() => setLoadingWithdrawals(false));

    return () => ac.abort();
  }, [userId, reloadKey]);

  const refreshing = loadingDeposits || loadingWithdrawals;

  return (
    <Card className="border-border/40">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('admin.history.title')}
          </p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={refreshing}
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-colors',
              'text-muted-foreground hover:text-foreground hover:bg-muted/40',
              refreshing && 'opacity-50 cursor-not-allowed',
            )}
            aria-label={t('common.refresh')}
          >
            <RefreshCw className={cn('size-3', refreshing && 'animate-spin')} />
            {t('common.refresh')}
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {/* ── Deposits ──────────────────────────────────────────────────── */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowDownToLine className="size-4 text-emerald-400" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {t('admin.history.depositsTitle')}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {depositsTotal} {t('admin.history.totalLabel')}
              </span>
            </div>

            {loadingDeposits ? (
              <div className="flex h-24 items-center justify-center">
                <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : deposits.length === 0 ? (
              <p className="py-6 text-center text-[11px] italic text-muted-foreground">
                {t('admin.history.noDeposits')}
              </p>
            ) : (
              <ul className="divide-y divide-border/30 rounded-lg border border-border/30 overflow-hidden">
                {deposits.map((d) => (
                  <li
                    key={d.id}
                    className="px-2.5 py-2 hover:bg-muted/10 transition-colors space-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold tabular-nums">
                        ${formatBalance(weiToUsdt(d.amount))}
                      </span>
                      <StatusBadge status={d.status} />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                      <span>{fmtDate(d.createdAt)}</span>
                      {d.txHash ? (
                        <a
                          href={bscscanLink(d.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono hover:text-primary transition-colors"
                        >
                          {shortHash(d.txHash)}
                          <ExternalLink className="size-2.5" />
                        </a>
                      ) : (
                        <span className="font-mono">—</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Withdrawals ───────────────────────────────────────────────── */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpFromLine className="size-4 text-rose-400" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {t('admin.history.withdrawalsTitle')}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {withdrawalsTotal} {t('admin.history.totalLabel')}
              </span>
            </div>

            {loadingWithdrawals ? (
              <div className="flex h-24 items-center justify-center">
                <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : withdrawals.length === 0 ? (
              <p className="py-6 text-center text-[11px] italic text-muted-foreground">
                {t('admin.history.noWithdrawals')}
              </p>
            ) : (
              <ul className="divide-y divide-border/30 rounded-lg border border-border/30 overflow-hidden">
                {withdrawals.map((w) => (
                  <li
                    key={w.id}
                    className="px-2.5 py-2 hover:bg-muted/10 transition-colors space-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-bold tabular-nums">
                          ${formatBalance(w.amount)}
                        </span>
                        <span className="rounded-full bg-muted/30 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide whitespace-nowrap">
                          {w.walletType}
                        </span>
                      </div>
                      <StatusBadge status={w.status} />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                      <span>{fmtDate(w.createdAt)}</span>
                      {w.txHash ? (
                        <a
                          href={bscscanLink(w.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono hover:text-primary transition-colors"
                        >
                          {shortHash(w.txHash)}
                          <ExternalLink className="size-2.5" />
                        </a>
                      ) : (
                        <code className="font-mono text-[10px]">
                          → {w.withdrawalAddress.slice(0, 6)}…{w.withdrawalAddress.slice(-4)}
                        </code>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 tabular-nums">
                      <span>
                        {t('admin.history.fee')}: ${formatBalance(w.fee)}
                      </span>
                      <span className="font-semibold text-emerald-400">
                        {t('admin.history.net')} ${formatBalance(w.netAmount)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <p className="text-[10px] text-muted-foreground/60 italic text-center pt-1 border-t border-border/20">
          {t('admin.history.latestLimit', { limit: LIMIT })}
        </p>
      </CardContent>
    </Card>
  );
}
