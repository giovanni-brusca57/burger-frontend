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
  getAdminDeposits,
  exportDepositsCsv,
  downloadBlob,
  type AdminDepositListEntry,
  type AdminDepositStatus,
} from '@/lib/admin';
import { formatBalance } from '@/lib/helpers';
import { TablePagination } from '@/components/common/TablePagination';
import { DatePicker } from '@/components/ui/date-picker';

const PAGE_SIZE = 20;

const STATUSES: AdminDepositStatus[] = ['PENDING', 'COMPLETED', 'FAILED'];

const STATUS_COLOR: Record<AdminDepositStatus, string> = {
  PENDING:   'bg-amber-500/10 text-amber-400 border-amber-500/30',
  COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  FAILED:    'bg-rose-500/10 text-rose-400 border-rose-500/30',
};

function dateInputToIso(d: string, isStart: boolean): string | undefined {
  if (!d) return undefined;
  return isStart
    ? new Date(`${d}T00:00:00.000Z`).toISOString()
    : new Date(`${d}T23:59:59.999Z`).toISOString();
}

export function DepositsTab() {
  const { t } = useTranslation();
  const [deposits, setDeposits] = useState<AdminDepositListEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async (p: number, signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await getAdminDeposits(
        {
          status: statusFilter ? (statusFilter as AdminDepositStatus) : undefined,
          dateFrom: dateInputToIso(dateFrom, true),
          dateTo: dateInputToIso(dateTo, false),
          limit: PAGE_SIZE,
          offset: p * PAGE_SIZE,
        },
        signal,
      );
      if (res.data.length === 0 && res.total > 0 && p > 0) {
        const lastPage = Math.max(0, Math.ceil(res.total / PAGE_SIZE) - 1);
        const res2 = await getAdminDeposits(
          {
            status: statusFilter ? (statusFilter as AdminDepositStatus) : undefined,
            dateFrom: dateInputToIso(dateFrom, true),
            dateTo: dateInputToIso(dateTo, false),
            limit: PAGE_SIZE,
            offset: lastPage * PAGE_SIZE,
          },
          signal,
        );
        setDeposits(res2.data);
        setTotal(res2.total);
        setPage(lastPage);
      } else {
        setDeposits(res.data);
        setTotal(res.total);
        setPage(p);
      }
    } catch (err: any) {
      if (err?.message !== 'canceled') toast.error(t('admin.deposits.loadFail'));
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
      // Export hits the older /admin/deposits/export endpoint — it accepts
      // status only (no date range). Pass the active status filter through;
      // BE-side date filtering on exports can be added later.
      const { blob, filename } = await exportDepositsCsv({
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
      {/* Filter bar: status + date range + refresh + export. Mirrors the new
          BE filters on GET /admin/deposit (status / userId / dateFrom / dateTo).
          userId is reachable via the per-user detail view, not this tab. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
        <Select
          value={statusFilter || ' '}
          onValueChange={(v) => setStatusFilter(v === ' ' ? '' : v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t('admin.deposits.allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">{t('admin.deposits.allStatuses')}</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`admin.deposits.status.${s}` as const, s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-muted-foreground">
            {t('admin.deposits.dateFrom')}
          </label>
          <DatePicker
            value={dateFrom}
            onChange={setDateFrom}
            max={dateTo || undefined}
            className="w-[150px]"
            aria-label={t('admin.deposits.dateFrom')}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-muted-foreground">
            {t('admin.deposits.dateTo')}
          </label>
          <DatePicker
            value={dateTo}
            onChange={setDateTo}
            min={dateFrom || undefined}
            className="w-[150px]"
            aria-label={t('admin.deposits.dateTo')}
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
        {t('admin.deposits.totalCount', { count: total })}
      </p>

      {loading && deposits.length === 0 ? (
        <div className="flex h-32 items-center justify-center">
          <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : deposits.length === 0 ? (
        <p className="py-8 text-center text-sm italic text-muted-foreground">
          {t('admin.deposits.noResults')}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {[
                    t('admin.deposits.colUser'),
                    t('admin.deposits.colAmount'),
                    t('admin.deposits.colStatus'),
                    t('admin.deposits.colTxHash'),
                    t('admin.deposits.colBlock'),
                    t('admin.deposits.colDate'),
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
                {deposits.map((d) => {
                  const statusClass =
                    STATUS_COLOR[d.status as AdminDepositStatus] ??
                    'bg-muted text-muted-foreground border-border/50';
                  return (
                    <tr key={d.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-3 py-3 text-xs">
                        <p className="font-medium truncate max-w-[160px]">{d.user.email}</p>
                      </td>
                      <td className="px-3 py-3 text-xs font-bold text-emerald-400 tabular-nums">
                        ${formatBalance(d.amount)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                            statusClass,
                          )}
                        >
                          {t(`admin.deposits.status.${d.status}` as const, d.status)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <code className="text-[10px] font-mono text-muted-foreground">
                          {d.txHash.slice(0, 8)}…{d.txHash.slice(-6)}
                        </code>
                      </td>
                      <td className="px-3 py-3 text-[10px] text-muted-foreground tabular-nums">
                        {d.blockNumber ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(d.createdAt).toLocaleString('en-GB', {
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
