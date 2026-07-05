import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getAdminWithdrawals,
  exportWithdrawalsCsv,
  downloadBlob,
  type AdminWithdrawalListEntry,
  type AdminWithdrawalListStatus,
} from '@/lib/admin';
import { formatBalance } from '@/lib/helpers';
import { TablePagination } from '@/components/common/TablePagination';
import { DatePicker } from '@/components/ui/date-picker';

const PAGE_SIZE = 20;

// All statuses the BE can return on withdrawal rows. 'REJECTED' is historical
// (the manual rejection flow was removed) but kept in the filter dropdown so
// admins can still surface legacy rejected rows.
const STATUSES: AdminWithdrawalListStatus[] = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'REJECTED',
];

const STATUS_COLOR: Record<AdminWithdrawalListStatus, string> = {
  PENDING:    'bg-amber-500/10 text-amber-400 border-amber-500/30',
  PROCESSING: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  COMPLETED:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  FAILED:     'bg-rose-500/10 text-rose-400 border-rose-500/30',
  REJECTED:   'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
};

/** Convert a `<input type="date">` value (YYYY-MM-DD) into an ISO-8601 instant
 *  the BE accepts. `isStart=true` pins midnight UTC, `false` pins end-of-day
 *  UTC so the inclusive range [dateFrom, dateTo] actually covers the picked
 *  end date. Returns undefined when the input is empty. */
function dateInputToIso(d: string, isStart: boolean): string | undefined {
  if (!d) return undefined;
  return isStart
    ? new Date(`${d}T00:00:00.000Z`).toISOString()
    : new Date(`${d}T23:59:59.999Z`).toISOString();
}

export function WithdrawalsTab() {
  const { t } = useTranslation();
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawalListEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  // BE supports filter by status / userId / dateFrom / dateTo. Date inputs are
  // YYYY-MM-DD strings — converted to ISO instants only when issuing the
  // request so the inputs round-trip cleanly through state.
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async (p: number, signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await getAdminWithdrawals(
        {
          status: statusFilter ? (statusFilter as AdminWithdrawalListStatus) : undefined,
          dateFrom: dateInputToIso(dateFrom, true),
          dateTo: dateInputToIso(dateTo, false),
          limit: PAGE_SIZE,
          offset: p * PAGE_SIZE,
        },
        signal,
      );
      // Fallback-to-last-page guard — if a filter change leaves us beyond the
      // last page, snap back instead of showing an empty grid.
      if (res.data.length === 0 && res.total > 0 && p > 0) {
        const lastPage = Math.max(0, Math.ceil(res.total / PAGE_SIZE) - 1);
        const res2 = await getAdminWithdrawals(
          {
            status: statusFilter ? (statusFilter as AdminWithdrawalListStatus) : undefined,
            dateFrom: dateInputToIso(dateFrom, true),
            dateTo: dateInputToIso(dateTo, false),
            limit: PAGE_SIZE,
            offset: lastPage * PAGE_SIZE,
          },
          signal,
        );
        setWithdrawals(res2.data);
        setTotal(res2.total);
        setPage(lastPage);
      } else {
        setWithdrawals(res.data);
        setTotal(res.total);
        setPage(p);
      }
    } catch (err: any) {
      if (err?.message !== 'canceled') toast.error(t('admin.withdrawals.loadFail'));
    }
    setLoading(false);
  }, [statusFilter, dateFrom, dateTo, t]);

  useEffect(() => {
    const ac = new AbortController();
    load(0, ac.signal);
    return () => ac.abort();
  }, [load]);

  async function handleExportCsv() {
    if (exporting) return;
    setExporting(true);
    try {
      // Export still hits the older /admin/withdrawals/export endpoint, which
      // uses (search, status). We mirror status only — date-range scoping for
      // exports can be added on the BE later if needed.
      const { blob, filename } = await exportWithdrawalsCsv({
        status: statusFilter || undefined,
      });
      downloadBlob(blob, filename);
      toast.success(t('admin.toast.exportSuccess'));
    } catch (err: any) {
      let msg = err?.message ?? t('admin.toast.exportFailed');
      if (err?.data instanceof Blob) {
        try {
          const text = await err.data.text();
          const json = JSON.parse(text);
          if (json?.message) msg = String(json.message);
        } catch { /* not JSON */ }
      }
      toast.error(msg);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Filter bar: status + date range + refresh + export. BE no longer
          accepts a free-text search; date range + userId are the only filters
          on /admin/wallet/withdrawals. UserId filtering is reachable from the
          user-detail panel (jump-to-user pattern) rather than this tab. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
        <Select
          value={statusFilter || ' '}
          onValueChange={(v) => setStatusFilter(v === ' ' ? '' : v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t('admin.withdrawals.allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">{t('admin.withdrawals.allStatuses')}</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`admin.withdrawals.status.${s}` as const, s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-muted-foreground">
            {t('admin.withdrawals.dateFrom')}
          </label>
          <DatePicker
            value={dateFrom}
            onChange={setDateFrom}
            max={dateTo || undefined}
            className="w-[150px]"
            aria-label={t('admin.withdrawals.dateFrom')}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-muted-foreground">
            {t('admin.withdrawals.dateTo')}
          </label>
          <DatePicker
            value={dateTo}
            onChange={setDateTo}
            min={dateFrom || undefined}
            className="w-[150px]"
            aria-label={t('admin.withdrawals.dateTo')}
          />
        </div>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="outline"
          className="h-9 gap-1.5 text-xs"
          onClick={() => load(page)}
          disabled={loading}
        >
          <RefreshCw className={cn('size-3', loading && 'animate-spin')} />
          {t('common.refresh')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-9 gap-1.5 text-xs"
          onClick={handleExportCsv}
          disabled={exporting}
          title={t('admin.search.exportCsvHint')}
        >
          {exporting ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Download className="size-3" />
          )}
          {exporting ? t('admin.search.exporting') : t('admin.search.exportCsv')}
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {t('admin.withdrawals.totalCount', { count: total })}
      </p>

      {loading && withdrawals.length === 0 ? (
        <div className="flex h-32 items-center justify-center">
          <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : withdrawals.length === 0 ? (
        <p className="py-8 text-center text-sm italic text-muted-foreground">
          {t('admin.withdrawals.noResults')}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {[
                    t('admin.withdrawals.colUser'),
                    t('admin.withdrawals.colWallet'),
                    t('admin.withdrawals.colAmount'),
                    t('admin.withdrawals.colFee'),
                    t('admin.withdrawals.colNet'),
                    t('admin.withdrawals.colAddress'),
                    t('admin.withdrawals.colStatus'),
                    t('admin.withdrawals.colTxHash'),
                    t('admin.withdrawals.colDate'),
                  ].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {withdrawals.map((w) => {
                  // Defensive — BE may return a status outside the known
                  // enum for legacy rows; fall back to a neutral pill.
                  const statusClass =
                    STATUS_COLOR[w.status as AdminWithdrawalListStatus] ??
                    'bg-muted text-muted-foreground border-border/50';
                  return (
                    <tr key={w.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-3 py-3 text-xs">
                        <p className="font-medium truncate max-w-[160px]">{w.user.email}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-muted/30 px-2 py-0.5 text-[10px] font-semibold">
                          {w.walletType}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs font-semibold tabular-nums">
                        ${formatBalance(w.amount)}
                      </td>
                      <td className="px-3 py-3 text-xs text-amber-400 tabular-nums">
                        ${formatBalance(w.fee)}
                      </td>
                      <td className="px-3 py-3 text-xs font-bold text-emerald-400 tabular-nums">
                        ${formatBalance(w.netAmount)}
                      </td>
                      <td className="px-3 py-3">
                        <code className="text-[10px] font-mono text-muted-foreground">
                          {w.withdrawalAddress.slice(0, 8)}…{w.withdrawalAddress.slice(-6)}
                        </code>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                            statusClass,
                          )}
                        >
                          {t(`admin.withdrawals.status.${w.status}` as const, w.status)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {w.txHash ? (
                          <code className="text-[10px] font-mono text-muted-foreground">
                            {w.txHash.slice(0, 8)}…{w.txHash.slice(-6)}
                          </code>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/60">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(w.createdAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <TablePagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            loading={loading}
            onPageChange={(p: number) => load(p)}
          />
        </>
      )}
    </div>
  );
}
