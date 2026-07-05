import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Search, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getRaiders, type RaiderEntry } from '@/lib/admin';
import { formatBalance } from '@/lib/helpers';
import { RANKS, RANK_LABEL, RANK_COLOR } from '@/lib/constants';
import { TablePagination } from '@/components/common/TablePagination';
import { toast } from 'sonner';

const PAGE_SIZE = 20;

interface Props {
  onViewUser: (userId: string) => void;
  /** Bump by parent (e.g. AdminPage after a raider grant/revoke completes)
   *  to refetch the current page without dropping the active filters. */
  refreshKey?: number;
}

export function RaidersTab({ onViewUser, refreshKey = 0 }: Props) {
  const { t } = useTranslation();
  const [raiders, setRaiders] = useState<RaiderEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  // `searchInput` is the typing buffer; `query` is the committed value sent
  // to the BE. Commit on Enter / blur to avoid a roundtrip per keystroke.
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [rankFilter, setRankFilter] = useState<string>('');

  const load = useCallback(async (p: number, signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await getRaiders(
        {
          search: query || undefined,
          rank: rankFilter || undefined,
          limit: PAGE_SIZE,
          offset: p * PAGE_SIZE,
        },
        signal,
      );
      // Fallback-to-last-page guard — if a filter narrows the result set
      // below the current page, snap back instead of showing an empty grid.
      if (res.data.length === 0 && res.total > 0 && p > 0) {
        const lastPage = Math.max(0, Math.ceil(res.total / PAGE_SIZE) - 1);
        const res2 = await getRaiders(
          {
            search: query || undefined,
            rank: rankFilter || undefined,
            limit: PAGE_SIZE,
            offset: lastPage * PAGE_SIZE,
          },
          signal,
        );
        setRaiders(res2.data);
        setTotal(res2.total);
        setPage(lastPage);
      } else {
        setRaiders(res.data);
        setTotal(res.total);
        setPage(p);
      }
    } catch (err: any) {
      if (err?.message !== 'canceled') toast.error(t('admin.raiders.loadFail'));
    }
    setLoading(false);
  }, [query, rankFilter, t]);

  // Refetch on any filter change OR when the parent bumps `refreshKey`
  // (e.g. raider grant/revoke happened elsewhere in admin UI).
  useEffect(() => {
    const ac = new AbortController();
    load(0, ac.signal);
    return () => ac.abort();
  }, [load, refreshKey]);

  function handleSearch() {
    setQuery(searchInput.trim());
  }

  return (
    <Card className="border-border/40">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-amber-400" />
          <p className="text-sm font-bold">{t('admin.raiders.title')}</p>
          <span className="text-[10px] text-muted-foreground">
            {t('admin.raiders.count', { count: total })}
          </span>
        </div>

        {/* Filter bar: search + rank + refresh */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              placeholder={t('admin.raiders.searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              onBlur={handleSearch}
              className="min-h-9 w-full rounded-lg border border-border/80 bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Select
            value={rankFilter || ' '}
            onValueChange={(v) => setRankFilter(v === ' ' ? '' : v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t('admin.raiders.allRanks')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">{t('admin.raiders.allRanks')}</SelectItem>
              {RANKS.map((r) => (
                <SelectItem key={r} value={r}>{RANK_LABEL[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        </div>

        {loading && raiders.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : raiders.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-6 text-center">
            {total === 0 && !query && !rankFilter
              ? t('admin.raiders.empty')
              : t('admin.raiders.noResults')}
          </p>
        ) : (
          <div className="space-y-1">
            {raiders.map((r) => {
              const pct = parseFloat(r.progress);
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border/30 px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{r.email}</p>
                      <span className={cn('text-[9px] font-bold', RANK_COLOR[r.rank])}>{RANK_LABEL[r.rank]}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                      <span>{t('admin.raiders.free')}: <span className="font-bold text-amber-400">${formatBalance(r.raiderFreeAmount)}</span></span>
                      <span>{t('admin.raiders.target')}: <span className="font-bold text-foreground">${formatBalance(r.raiderTargetTurnover)}</span></span>
                      <span>{t('admin.raiders.turnover')}: <span className="font-bold text-emerald-400">${formatBalance(r.cleanTurnover)}</span></span>
                      {r.raiderNote && <span className="italic truncate max-w-[150px]">{r.raiderNote}</span>}
                    </div>
                  </div>
                  <div className="shrink-0 w-24 space-y-0.5">
                    <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', r.unlocked ? 'bg-emerald-500' : 'bg-amber-500')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className={cn('text-[10px] font-bold text-right', r.unlocked ? 'text-emerald-400' : 'text-amber-400')}>
                      {r.unlocked ? t('admin.raiders.unlocked') : `${pct}%`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] shrink-0"
                    onClick={() => onViewUser(r.id)}
                  >
                    {t('admin.raiders.view')}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        <TablePagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          loading={loading}
          onPageChange={(p) => load(p)}
        />
      </CardContent>
    </Card>
  );
}
