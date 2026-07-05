import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Download, Loader2, TrendingUp, Coins, Search } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  getTradingInflow,
  getTokenPurchases,
  exportTokenPurchasesCsv,
  downloadBlob,
  type TradingInflow,
  type TokenPurchaseEntry,
} from '@/lib/admin';
import { formatBalance } from '@/lib/helpers';
import { TablePagination } from '@/components/common/TablePagination';
import { DatePicker } from '@/components/ui/date-picker';

const PAGE_SIZE = 20;

/** Local date input (YYYY-MM-DD) → ISO 8601 day boundary, matching DepositsTab. */
function dateInputToIso(d: string, isStart: boolean): string | undefined {
  if (!d) return undefined;
  return isStart
    ? new Date(`${d}T00:00:00.000Z`).toISOString()
    : new Date(`${d}T23:59:59.999Z`).toISOString();
}

export function ReportsTab() {
  const { t } = useTranslation();

  // Shared date range — drives BOTH the turnover summary and the token list,
  // so the two reports always describe the same window.
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Turnover summary
  const [turnover, setTurnover] = useState<TradingInflow | null>(null);
  const [turnoverLoading, setTurnoverLoading] = useState(false);

  // Token purchases list
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [purchases, setPurchases] = useState<TokenPurchaseEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalTokensSold, setTotalTokensSold] = useState('0');
  const [totalRaisedUsd, setTotalRaisedUsd] = useState('0');
  const [page, setPage] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadTurnover = useCallback(
    async (signal?: AbortSignal) => {
      setTurnoverLoading(true);
      try {
        const res = await getTradingInflow(
          {
            dateFrom: dateInputToIso(dateFrom, true),
            dateTo: dateInputToIso(dateTo, false),
          },
          signal,
        );
        setTurnover(res);
      } catch (err: any) {
        if (err?.message !== 'canceled') toast.error(t('admin.reports.turnoverLoadFail'));
      }
      setTurnoverLoading(false);
    },
    [dateFrom, dateTo, t],
  );

  const loadPurchases = useCallback(
    async (p: number, signal?: AbortSignal) => {
      setListLoading(true);
      try {
        const res = await getTokenPurchases(
          {
            search: search || undefined,
            dateFrom: dateInputToIso(dateFrom, true),
            dateTo: dateInputToIso(dateTo, false),
            limit: PAGE_SIZE,
            offset: p * PAGE_SIZE,
          },
          signal,
        );
        // Snap back to the last valid page if filters shrank the result set
        // beneath the current offset (mirrors DepositsTab).
        if (res.data.length === 0 && res.total > 0 && p > 0) {
          const lastPage = Math.max(0, Math.ceil(res.total / PAGE_SIZE) - 1);
          return loadPurchases(lastPage, signal);
        }
        setPurchases(res.data);
        setTotal(res.total);
        setTotalTokensSold(res.totalTokensSold);
        setTotalRaisedUsd(res.totalRaisedUsd);
        setPage(p);
      } catch (err: any) {
        if (err?.message !== 'canceled') toast.error(t('admin.reports.purchasesLoadFail'));
      }
      setListLoading(false);
    },
    [search, dateFrom, dateTo, t],
  );

  // Refetch both reports whenever the shared filters change.
  useEffect(() => {
    const ac = new AbortController();
    loadTurnover(ac.signal);
    loadPurchases(0, ac.signal);
    return () => ac.abort();
  }, [loadTurnover, loadPurchases]);

  function applySearch() {
    setSearch(searchInput.trim());
  }

  async function handleExportCsv() {
    if (exporting) return;
    setExporting(true);
    try {
      const { blob, filename } = await exportTokenPurchasesCsv({
        search: search || undefined,
        dateFrom: dateInputToIso(dateFrom, true),
        dateTo: dateInputToIso(dateTo, false),
      });
      downloadBlob(blob, filename);
      toast.success(t('admin.toast.exportSuccess'));
    } catch (err: any) {
      let msg = err?.message ?? t('admin.toast.exportFailed');
      if (err?.data instanceof Blob) {
        try {
          const json = JSON.parse(await err.data.text());
          if (json?.message) msg = String(json.message);
        } catch { /* not JSON */ }
      }
      toast.error(msg);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Shared date-range filter bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:flex-wrap">
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-muted-foreground">{t('admin.deposits.dateFrom')}</label>
          <DatePicker
            value={dateFrom}
            onChange={setDateFrom}
            max={dateTo || undefined}
            className="w-[150px]"
            aria-label={t('admin.deposits.dateFrom')}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-muted-foreground">{t('admin.deposits.dateTo')}</label>
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
          onClick={() => {
            loadTurnover();
            loadPurchases(page);
          }}
          disabled={turnoverLoading || listLoading}
        >
          <RefreshCw className={cn('size-3', (turnoverLoading || listLoading) && 'animate-spin')} />
          {t('common.refresh')}
        </Button>
      </div>

      {/* ── Trading turnover summary ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/50 bg-card/40 p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <TrendingUp className="size-3.5 text-emerald-400" />
            {t('admin.reports.turnoverTitle')}
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-400">
            {turnoverLoading && !turnover ? '—' : `$${formatBalance(turnover?.totalInflow ?? '0')}`}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t('admin.reports.turnoverTxCount', { count: turnover?.transactionCount ?? 0 })}
            {!dateFrom && !dateTo ? ` · ${t('admin.reports.allTime')}` : ''}
          </p>
        </div>

        <div className="rounded-xl border border-border/50 bg-card/40 p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Coins className="size-3.5 text-amber-400" />
            {t('admin.reports.presaleTitle')}
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <p className="text-2xl font-bold tabular-nums text-amber-400">
              {formatBalance(totalTokensSold)} <span className="text-sm font-medium text-muted-foreground">$BURG</span>
            </p>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t('admin.reports.raisedUsd', { amount: formatBalance(totalRaisedUsd) })}
          </p>
        </div>
      </div>

      {/* ── Token purchases list ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              placeholder={t('admin.reports.searchPlaceholder')}
              className="h-9 w-full rounded-lg border border-border/80 bg-card pl-8 pr-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs" onClick={applySearch}>
            <Search className="size-3" />
            {t('admin.reports.searchBtn')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 text-xs"
            onClick={handleExportCsv}
            disabled={exporting}
            title={t('admin.search.exportCsvHint')}
          >
            {exporting ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
            {exporting ? t('admin.search.exporting') : t('admin.search.exportCsv')}
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          {t('admin.reports.totalCount', { count: total })}
        </p>

        {listLoading && purchases.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : purchases.length === 0 ? (
          <p className="py-8 text-center text-sm italic text-muted-foreground">
            {t('admin.reports.noResults')}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-border/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    {[
                      t('admin.reports.colUser'),
                      t('admin.reports.colTokens'),
                      t('admin.reports.colUsdt'),
                      t('admin.reports.colPrice'),
                      t('admin.reports.colDate'),
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
                  {purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-3 py-3 text-xs">
                        <p className="font-medium truncate max-w-[180px]">{p.userEmail}</p>
                        <code className="text-[10px] font-mono text-muted-foreground">
                          {p.walletAddress.slice(0, 8)}…{p.walletAddress.slice(-6)}
                        </code>
                      </td>
                      <td className="px-3 py-3 text-xs font-bold tabular-nums text-amber-400">
                        {formatBalance(p.tokenAmount)} $BURG
                      </td>
                      <td className="px-3 py-3 text-xs font-semibold tabular-nums text-emerald-400">
                        ${formatBalance(p.usdtAmount)}
                      </td>
                      <td className="px-3 py-3 text-[11px] tabular-nums text-muted-foreground">
                        ${formatBalance(p.priceAtTime)}
                      </td>
                      <td className="px-3 py-3 text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(p.createdAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TablePagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              loading={listLoading}
              onPageChange={(p: number) => loadPurchases(p)}
            />
          </>
        )}
      </div>
    </div>
  );
}
