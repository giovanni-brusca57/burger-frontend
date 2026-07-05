import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Download, Loader2 } from 'lucide-react';
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
import { UserDetailPanel } from './UserDetailPanel';
import { BalanceAdjustModal } from './BalanceAdjustModal';
import { RaiderModal } from './RaiderModal';
import {
  searchUsers,
  getUserDetail,
  adjustBalance,
  setUserRank,
  setRaider,
  invalidateUserDetail,
  exportUsersCsv,
  downloadBlob,
  type AdminUser,
  type UserDetail,
} from '@/lib/admin';
import { RANKS, RANK_LABEL, RANK_COLOR } from '@/lib/constants';
import { TablePagination } from '@/components/common/TablePagination';

const PAGE_SIZE = 15;

interface Props {
  initialUserId?: string;
  onRaiderChanged?: () => void;
}

export function UserManagementTab({ initialUserId, onRaiderChanged }: Props) {
  const { t } = useTranslation();

  // Search state
  const [query, setQuery] = useState('');
  const [rankFilter, setRankFilter] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [searching, setSearching] = useState(false);

  // Detail state
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Balance modal
  const [balanceModal, setBalanceModal] = useState<{ type: string } | null>(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceOp, setBalanceOp] = useState<'add' | 'set'>('add');

  // Raider modal
  const [raiderModal, setRaiderModal] = useState(false);
  const [raiderAmount, setRaiderAmount] = useState('500');
  const [raiderTarget, setRaiderTarget] = useState('1500');
  const [raiderNote, setRaiderNote] = useState('');

  // Rank confirmation
  const [pendingRank, setPendingRank] = useState<string | null>(null);

  // CSV export state. Disabled while exporting so admins don't fire multiple
  // streaming downloads in parallel — large exports can take a few seconds.
  const [exporting, setExporting] = useState(false);

  // Auto-scroll to detail panel on mobile when a user is selected
  const detailRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (detail && detailRef.current && window.innerWidth < 1024) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [detail]);

  // Cancel in-flight detail fetch when the admin clicks a different user
  // mid-load. Prevents fan-out of parallel requests and 429s during rapid
  // navigation across the list.
  const detailAbortRef = useRef<AbortController | null>(null);

  const doSearch = useCallback(async (p = 0, signal?: AbortSignal) => {
    setSearching(true);
    try {
      const rank = rankFilter === ' ' ? undefined : (rankFilter || undefined);
      const res = await searchUsers({
        search: query || undefined,
        rank,
        limit: PAGE_SIZE,
        offset: p * PAGE_SIZE,
      }, signal);
      setUsers(res.data);
      setTotal(res.total);
      setPage(p);
    } catch (err: any) {
      if (err?.message !== 'canceled') { /* ignore */ }
    }
    setSearching(false);
  }, [query, rankFilter]);

  // Auto-search page 0 whenever the rank filter changes — abort on cleanup to prevent Strict Mode double-fetch
  useEffect(() => {
    const ac = new AbortController();
    doSearch(0, ac.signal);
    return () => ac.abort();
  }, [rankFilter]); // eslint-disable-line

  useEffect(() => {
    if (initialUserId) selectUser(initialUserId);
  }, [initialUserId]); // eslint-disable-line

  async function selectUser(userId: string, force = false) {
    // No-op when re-clicking the already-selected user (cache would short-circuit
    // anyway, but skipping the loading flicker is nicer UX).
    if (!force && detail?.id === userId) return;

    detailAbortRef.current?.abort();
    const ac = new AbortController();
    detailAbortRef.current = ac;

    if (force) invalidateUserDetail(userId);
    setLoadingDetail(true);
    try {
      const d = await getUserDetail(userId, ac.signal);
      if (!ac.signal.aborted) setDetail(d);
    } catch (err: any) {
      if (ac.signal.aborted || err?.name === 'AbortError' || err?.message === 'canceled') return;
      console.error('Failed to load user detail:', err);
      toast.error(`${t('admin.toast.loadUserFail')}: ${err?.message || 'Network/Server Error'}`);
    } finally {
      if (!ac.signal.aborted) setLoadingDetail(false);
    }
  }

  async function handleAdjustBalance() {
    if (!detail || !balanceModal) return;
    try {
      await adjustBalance(detail.id, {
        walletType: balanceModal.type,
        amount: balanceAmount,
        operation: balanceOp,
      });
      toast.success(balanceOp === 'add' ? t('admin.toast.balanceAdded') : t('admin.toast.balanceSet'));
      setBalanceModal(null);
      setBalanceAmount('');
      selectUser(detail.id, true);
    } catch (err: any) {
      toast.error(err?.message ?? t('admin.toast.failed'));
    }
  }

  async function handleChangeRank(rank: string) {
    if (!detail) return;
    setPendingRank(rank);
  }

  async function confirmChangeRank() {
    if (!detail || !pendingRank) return;
    try {
      await setUserRank(detail.id, pendingRank);
      toast.success(t('admin.toast.rankChanged', { rank: RANK_LABEL[pendingRank] }));
      selectUser(detail.id, true);
    } catch (err: any) {
      toast.error(err?.message ?? t('admin.toast.failed'));
    } finally {
      setPendingRank(null);
    }
  }

  async function handleExportCsv() {
    if (exporting) return;
    setExporting(true);
    try {
      const rank = rankFilter === ' ' ? undefined : (rankFilter || undefined);
      const { blob, filename } = await exportUsersCsv({
        search: query || undefined,
        rank,
      });
      downloadBlob(blob, filename);
      toast.success(t('admin.toast.exportSuccess'));
    } catch (err: any) {
      // BE returns errors as a JSON Blob under `responseType: 'blob'`. Try to
      // extract the real message; fall back to the generic one from the
      // axios interceptor (`err.message`) if parsing fails.
      let msg = err?.message ?? t('admin.toast.exportFailed');
      if (err?.data instanceof Blob) {
        try {
          const text = await err.data.text();
          const json = JSON.parse(text);
          if (json?.message) msg = String(json.message);
        } catch {
          // Body wasn't JSON — keep the interceptor's generic message.
        }
      }
      toast.error(msg);
    } finally {
      setExporting(false);
    }
  }

  async function handleSetRaider(isRaider: boolean) {
    if (!detail) return;
    try {
      await setRaider(detail.id, {
        isRaider,
        freeAmount: isRaider ? raiderAmount : undefined,
        targetTurnover: isRaider ? raiderTarget : undefined,
        note: isRaider ? raiderNote : undefined,
      });
      toast.success(isRaider ? t('admin.toast.raiderSet') : t('admin.toast.raiderRemoved'));
      setRaiderModal(false);
      // Raider state is rendered on the detail hero; the descendants tree
      // doesn't include the selected user, so the tree cache stays valid.
      selectUser(detail.id, true);
      onRaiderChanged?.();
    } catch (err: any) {
      toast.error(err?.message ?? t('admin.toast.failed'));
    }
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            placeholder={t('admin.search.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch(0)}
            className="min-h-12 w-full rounded-lg border border-border/80 bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <Select value={rankFilter} onValueChange={setRankFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t('admin.search.allRanks')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">{t('admin.search.allRanks')}</SelectItem>
            {RANKS.map((r) => (
              <SelectItem key={r} value={r}>{RANK_LABEL[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => doSearch(0)} className="h-9 px-4">
          <Search className="size-3.5 mr-1.5" />
          {t('admin.search.button')}
        </Button>
        {/* Exports the current filter view (query + rank) as CSV. Disabled
            while a download is in flight so admins don't double-fire on
            large exports. */}
        <Button
          variant="outline"
          onClick={handleExportCsv}
          disabled={exporting}
          className="h-9 px-4"
          title={t('admin.search.exportCsvHint')}
        >
          {exporting ? (
            <Loader2 className="size-3.5 mr-1.5 animate-spin" />
          ) : (
            <Download className="size-3.5 mr-1.5" />
          )}
          {exporting ? t('admin.search.exporting') : t('admin.search.exportCsv')}
        </Button>
      </div>

      <div className={cn('flex flex-col gap-4', detail && 'lg:flex-row lg:gap-6 lg:divide-x lg:divide-border/40 lg:h-[calc(100vh-220px)] lg:overflow-hidden')}>
        {/* Users list */}
        <div className={cn('min-w-0', detail ? 'lg:w-[380px] lg:shrink-0 lg:overflow-y-auto lg:h-full' : 'w-full')}>
          {searching ? (
            <div className="flex h-32 items-center justify-center">
              <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-8 text-center">{t('admin.search.noUsers')}</p>
          ) : (
            <>
              {/* Table header */}
              <div className="flex items-center gap-3 rounded-t-lg border border-border/60 bg-muted/30 px-3 py-2">
                <p className="flex-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('admin.search.colUser')}</p>
                <p className="shrink-0 min-w-[110px] pr-8 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('admin.search.colRank')}</p>
              </div>

              <div className="divide-y divide-border/20 rounded-b-lg border border-t-0 border-border/60">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => selectUser(u.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors first:rounded-t-none last:rounded-b-lg',
                      detail?.id === u.id
                        ? 'bg-primary/8 border-l-2 border-l-primary pl-2.5'
                        : 'hover:bg-muted/20',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{u.email}</p>
                        {u.isRaider && (
                          <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                            RAIDER
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{u.walletAddress}</p>
                    </div>
                    <span className={cn('text-[10px] font-bold shrink-0 whitespace-nowrap pl-3 pr-8 min-w-[110px] text-right', RANK_COLOR[u.rank])}>
                      {RANK_LABEL[u.rank]}
                    </span>
                  </button>
                ))}
              </div>
              <TablePagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                loading={searching}
                onPageChange={(p) => doSearch(p)}
              />
            </>
          )}
        </div>


        {/* Detail panel */}
        {detail && (
          <div ref={detailRef} className="flex-1 min-w-0 lg:pl-2 lg:overflow-y-auto lg:h-full">
            <UserDetailPanel
              detail={detail}
              loading={loadingDetail}
              onClose={() => setDetail(null)}
              onChangeRank={handleChangeRank}
              onDetailRefresh={() => selectUser(detail.id, true)}
              onOpenBalanceModal={(type) => {
                setBalanceModal({ type });
                setBalanceAmount('');
                setBalanceOp('add');
              }}
              onOpenRaiderModal={() => {
                setRaiderModal(true);
                setRaiderAmount(detail.raiderFreeAmount ?? '500');
                setRaiderTarget(detail.raiderTargetTurnover ?? '1500');
                setRaiderNote(detail.raiderNote ?? '');
              }}
            />
          </div>
        )}
      </div>

      {/* Balance adjust modal */}
      {balanceModal && (
        <BalanceAdjustModal
          walletType={balanceModal.type}
          userEmail={detail?.email}
          amount={balanceAmount}
          operation={balanceOp}
          onChangeAmount={setBalanceAmount}
          onChangeOperation={setBalanceOp}
          onConfirm={handleAdjustBalance}
          onClose={() => setBalanceModal(null)}
        />
      )}

      {raiderModal && detail && (
        <RaiderModal
          detail={detail}
          amount={raiderAmount}
          target={raiderTarget}
          note={raiderNote}
          onChangeAmount={setRaiderAmount}
          onChangeTarget={setRaiderTarget}
          onChangeNote={setRaiderNote}
          onSetRaider={handleSetRaider}
          onClose={() => setRaiderModal(false)}
        />
      )}

      {pendingRank && detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setPendingRank(null)}
        >
          <div
            className="bg-card border border-border rounded-xl p-5 w-80 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold">{t('admin.rank.confirmTitle')}</p>
            <p className="text-[11px] text-muted-foreground">
              {t('admin.rank.confirmDesc', {
                email: detail.email,
                rank: RANK_LABEL[pendingRank],
              })}
            </p>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setPendingRank(null)}>
                {t('common.cancel')}
              </Button>
              <Button size="sm" onClick={confirmChangeRank}>
                {t('admin.rank.confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
