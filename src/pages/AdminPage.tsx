import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Shield, FileClock, ArrowUpFromLine, ArrowDownToLine, TrendingUp, Zap, AlertTriangle, Loader2, Lock, CheckCircle2, Clock, Wrench, Coins, BarChart3 } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  getNextUtcLockDeadline,
  getUserTzAbbr,
  isUserInUtc,
  localTimeShort,
  useCountdown,
} from '@/lib/time';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { formatBalance } from '@/lib/helpers';
import { MevAdminSection } from '@/components/admin/MevAdminSection';
import { UserManagementTab } from '@/components/admin/UserManagementTab';
import { RaidersTab } from '@/components/admin/RaidersTab';
import { WithdrawalsTab } from '@/components/admin/WithdrawalsTab';
import { DepositsTab } from '@/components/admin/DepositsTab';
import { AuditLogTab } from '@/components/admin/AuditLogTab';
import { MaintenanceTab } from '@/components/admin/MaintenanceTab';
import { PresaleAdminTab } from '@/components/admin/PresaleAdminTab';
import { ReportsTab } from '@/components/admin/ReportsTab';
import { AdminSummaryCards } from '@/components/admin/AdminSummaryCards';
import {
  getAdminLogs,
  setDailyRate,
  getDailyRateStatus,
  type AdminLogEntry,
  type DailyRateStatus,
} from '@/lib/admin';

type Tab = 'search' | 'raiders' | 'deposits' | 'withdrawals' | 'logs' | 'mev' | 'trading' | 'maintenance' | 'presale' | 'reports';

const LOGS_PAGE_SIZE = 30;

export default function AdminPage() {
  const { t } = useTranslation();

  const TABS = [
    { key: 'search',      label: t('admin.tabs.userManagement'), icon: Users },
    { key: 'raiders',     label: t('admin.tabs.raiders'),        icon: Zap },
    { key: 'deposits',    label: t('admin.tabs.deposits'),       icon: ArrowDownToLine },
    { key: 'withdrawals', label: t('admin.tabs.withdrawals'),    icon: ArrowUpFromLine },
    { key: 'trading',     label: t('admin.tabs.tradingProfit'),  icon: TrendingUp },
    { key: 'presale',     label: t('admin.tabs.presale'),        icon: Coins },
    { key: 'reports',     label: t('admin.tabs.reports'),        icon: BarChart3 },
    { key: 'maintenance', label: t('admin.tabs.maintenance'),    icon: Wrench },
    { key: 'logs',        label: t('admin.tabs.auditLog'),       icon: FileClock },
    { key: 'mev',         label: t('admin.tabs.mevBot'),         icon: Shield },
  ] as const;
  const [activeTab, setActiveTab] = useState<Tab>('search');

  // RaidersTab owns its own list + filter + page state. AdminPage only holds
  // a refresh counter — bumping it tells the tab to refetch the current page
  // (e.g. after a raider grant/revoke fires from UserManagementTab).
  const [raidersRefreshKey, setRaidersRefreshKey] = useState(0);

  // Logs tab data
  const [logs, setLogs] = useState<AdminLogEntry[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(0);

  // Selected user to jump to from Raiders tab
  const [jumpToUserId, setJumpToUserId] = useState<string | undefined>();

  // Trading profit — single rate set per day, applied to all 3 batches
  const [profitRateMin, setProfitRateMin] = useState('0.006');
  const [profitRateMax, setProfitRateMax] = useState('0.01');
  const [distributing, setDistributing] = useState(false);
  const [confirmDistOpen, setConfirmDistOpen] = useState(false);
  const [dailyStatus, setDailyStatus] = useState<DailyRateStatus | null>(null);

  const refetchDailyStatus = useCallback(() => {
    const ac = new AbortController();
    getDailyRateStatus(ac.signal).then(setDailyStatus).catch(() => {});
    return () => ac.abort();
  }, []);

  // RaidersTab handles its own load lifecycle (search/rank/page state lives
  // there now). AdminPage no longer drives the fetch.

  useEffect(() => {
    if (activeTab !== 'logs') return;
    const ac = new AbortController();
    getAdminLogs({ limit: LOGS_PAGE_SIZE, offset: logsPage * LOGS_PAGE_SIZE }, ac.signal)
      .then((r) => { setLogs(r.data); setLogsTotal(r.total); })
      .catch(() => {});
    return () => ac.abort();
  }, [activeTab, logsPage]);

  useEffect(() => {
    if (activeTab !== 'trading') return;
    return refetchDailyStatus();
  }, [activeTab, refetchDailyStatus]);

  // Live countdown to the next set-rate window close. Hidden in fresh state
  // (no lock) or when already locked. `getNextUtcLockDeadline` returns next
  // 02:00 UTC (= 09:00 WIB on BE) — that's the deadline for both "today" and
  // "tomorrow" targets (in open-tomorrow window, the deadline is tomorrow's
  // 02:00, which is what the helper returns when current hour >= 2).
  const nextLockDeadline = (() => {
    if (activeTab !== 'trading') return null;
    if (!dailyStatus) return null;
    if (dailyStatus.isFresh) return null;
    if (dailyStatus.isLocked) return null;
    return getNextUtcLockDeadline();
  })();
  const lockCountdown = useCountdown(nextLockDeadline);
  const userTzAbbr = getUserTzAbbr();
  const userIsInUtc = isUserInUtc();

  /** Validate input + open the confirm dialog. The actual distribute fires from the dialog action. */
  function handleDistributeClick() {
    if (dailyStatus?.isLocked) {
      toast.error(dailyStatus.lockReason ?? t('admin.trading.rateLocked'));
      return;
    }
    const min = parseFloat(profitRateMin);
    const max = parseFloat(profitRateMax);
    if (isNaN(min) || isNaN(max) || min < 0 || min > max) {
      toast.error(t('admin.trading.invalidRate'));
      return;
    }
    setConfirmDistOpen(true);
  }

  async function runDistribute() {
    const min = parseFloat(profitRateMin);
    const max = parseFloat(profitRateMax);
    setDistributing(true);
    try {
      const res = await setDailyRate(min, max);
      toast.success(
        t('admin.trading.rateSetSuccess', {
          users: res.totalCredited,
          amount: res.totalAmount,
        }),
      );
      setConfirmDistOpen(false);
      refetchDailyStatus();
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.toLowerCase().includes('already')) {
        toast.error(t('admin.trading.alreadyDistributed'));
      } else {
        toast.error(msg || t('admin.toast.failed'));
      }
    }
    setDistributing(false);
  }

  function handleViewRaider(userId: string) {
    setJumpToUserId(userId);
    setActiveTab('search');
  }

  return (
    <div className="space-y-4 overflow-x-hidden">
      {/* Hero — Dashboard pattern (burger design) */}
      <div className="card-operator relative overflow-hidden p-5 sm:p-6">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-2/3 -z-0 opacity-60"
          style={{
            background:
              'radial-gradient(ellipse 60% 80% at 90% 50%, color-mix(in oklab, var(--destructive) 12%, transparent), transparent 70%)',
          }}
        />
        <div className="absolute right-4 top-4 z-10 hidden sm:inline-flex">
          <span className="rounded-full bg-[color:var(--destructive)]/15 border border-[color:var(--destructive)]/40 px-2.5 py-0.5 text-[11px] font-extrabold text-[color:var(--destructive)] tracking-wide font-mono">
            ADMIN
          </span>
        </div>
        <div className="relative z-10">
          <p className="eyebrow text-[color:var(--destructive)]">// CONTROL PANEL</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter leading-none mt-2 pr-28">
            {t('admin.pageTitle')}
          </h1>
          <p className="editorial-quote mt-2">
            &ldquo;Levers, dials, kill switches.&rdquo;
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-xl">
            {t('admin.pageSubtitle')}
          </p>
        </div>
      </div>

      {/* Platform-wide totals */}
      <AdminSummaryCards />

      {/* Tabs */}
      <div className="relative border-b border-border/50">
        <div className="flex overflow-x-auto scrollbar-hide gap-1 pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => {
              setActiveTab(key);
              if (key !== 'search') setJumpToUserId(undefined);
              if (key !== 'logs') setLogsPage(0);
            }}
            className={cn(
              'flex shrink-0 items-center gap-1.5 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide rounded-t-lg border border-b-0 transition-colors -mb-px',
              activeTab === key
                ? 'bg-card border-border/50 text-foreground'
                : 'bg-transparent border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
        </div>
      </div>

      {activeTab === 'search' && (
        <UserManagementTab
          initialUserId={jumpToUserId}
          // Bumping the refresh key tells RaidersTab to refetch its current
          // page with current filters — surfaces a freshly-granted raider
          // (or drops a revoked one) the next time the admin opens the tab,
          // without dropping their active search/rank/page state.
          onRaiderChanged={() => setRaidersRefreshKey((k) => k + 1)}
        />
      )}

      {activeTab === 'raiders' && (
        <RaidersTab
          refreshKey={raidersRefreshKey}
          onViewUser={handleViewRaider}
        />
      )}

      {activeTab === 'deposits' && <DepositsTab />}

      {activeTab === 'withdrawals' && <WithdrawalsTab />}

      {activeTab === 'trading' && (
        <div className="space-y-5 max-w-2xl">
          <p className="text-sm text-muted-foreground">{t('admin.trading.desc')}</p>

          {/* ── Today's Status Panel ─────────────────────────────────────── */}
          <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
            <div className="border-b border-border/40 bg-muted/20 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="size-3.5 text-muted-foreground" />
                <p className="text-[11px] font-semibold uppercase tracking-wide">
                  {t('admin.trading.statusTitle')}
                </p>
              </div>
              {dailyStatus?.isFresh && !dailyStatus.isLocked && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                  {t('admin.trading.freshState')}
                </span>
              )}
              {dailyStatus?.isLocked && (
                <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-400">
                  <Lock className="size-3" />
                  {t('admin.trading.lockedTitle')}
                </span>
              )}
            </div>
            <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {t('admin.trading.statusDate')}
                </p>
                <p className="font-semibold tabular-nums">
                  {dailyStatus?.date ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {t('admin.trading.statusCurrentTime')}
                </p>
                <p className="font-semibold tabular-nums">
                  {dailyStatus
                    // BE still returns the hour in WIB (UTC+7). Convert to UTC for display.
                    ? `${String(((dailyStatus.currentHourWib - 7) % 24 + 24) % 24).padStart(2, '0')}:00 UTC`
                    : '—'}
                </p>
                {!userIsInUtc && (
                  <p className="text-[10px] text-muted-foreground/80 tabular-nums mt-0.5">
                    {t('admin.trading.yourTime')}: {localTimeShort(new Date())} {userTzAbbr}
                  </p>
                )}
              </div>

              {/* Target date — what "set rate now" would affect */}
              {dailyStatus && (
                <div className="col-span-2 border-t border-border/30 pt-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    {dailyStatus.windowState === 'open-tomorrow'
                      ? t('admin.trading.settingRateForTomorrow')
                      : t('admin.trading.settingRateForToday')}
                  </p>
                  <p className="text-sm font-semibold tabular-nums">
                    {dailyStatus.targetDate}
                  </p>
                </div>
              )}

              {/* Lock countdown — universal across timezones */}
              {nextLockDeadline && lockCountdown && (
                <div className="col-span-2 border-t border-border/30 pt-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    {t('admin.trading.lockClosesIn')}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p
                      className={cn(
                        'text-sm font-bold tabular-nums',
                        dailyStatus?.isLocked ? 'text-rose-400' : 'text-amber-400',
                      )}
                    >
                      {lockCountdown}
                    </p>
                    {!userIsInUtc && (
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        ({t('admin.trading.deadline')}: {localTimeShort(nextLockDeadline)} {userTzAbbr})
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="col-span-2 border-t border-border/30 pt-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {t('admin.trading.targetRateLabel', { date: dailyStatus?.targetDate ?? '—' })}
                </p>
                {dailyStatus?.targetRate ? (
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="text-base font-bold text-primary tabular-nums">
                      {dailyStatus.targetRate.label}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {t('admin.trading.statusSetBy')}:{' '}
                      <span className="font-semibold">
                        {dailyStatus.targetRate.setBy === 'admin'
                          ? t('admin.trading.statusSetByAdmin')
                          : t('admin.trading.statusSetByAuto')}
                      </span>
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    {t('admin.trading.statusRateNotSet')}
                  </p>
                )}
              </div>
            </div>

            {/* Per-batch progress strip */}
            <div className="border-t border-border/40 grid grid-cols-3 divide-x divide-border/40">
              {dailyStatus?.batches.map((b) => {
                const isDone = b.distributed;
                return (
                  <div key={b.batchNumber} className="px-3 py-2.5">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('admin.trading.batchN', { n: b.batchNumber })}
                      </p>
                      {isDone ? (
                        <CheckCircle2 className="size-3.5 text-emerald-400" />
                      ) : (
                        <Clock className="size-3.5 text-muted-foreground/60" />
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                      {b.batchTime}
                    </p>
                    <p
                      className={cn(
                        'text-[10px] mt-1 leading-tight',
                        isDone ? 'text-emerald-400' : 'text-muted-foreground/70',
                      )}
                    >
                      {isDone
                        ? b.distributedBy === 'cron'
                          ? t('admin.trading.batchDoneByCron')
                          : t('admin.trading.batchDoneByAdmin')
                        : t('admin.trading.batchPending')}
                    </p>
                    {isDone && b.totalUsers != null && (
                      <p className="text-[10px] tabular-nums text-muted-foreground mt-0.5">
                        {b.totalUsers} · ${formatBalance(b.totalAmount ?? '0')}
                      </p>
                    )}
                    {isDone && b.distributedAt && !userIsInUtc && (
                      <p
                        className="text-[9px] text-muted-foreground/60 tabular-nums mt-0.5"
                        title={new Date(b.distributedAt).toLocaleString()}
                      >
                        {localTimeShort(b.distributedAt)} {userTzAbbr}
                      </p>
                    )}
                  </div>
                );
              }) ?? (
                <div className="col-span-3 px-3 py-3 text-center text-[11px] text-muted-foreground">
                  …
                </div>
              )}
            </div>
          </div>

          {/* ── Set Rate Form (today or tomorrow, depending on window) ───── */}
          <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
            <div className="border-b border-border/40 bg-muted/20 px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide">
                {dailyStatus?.windowState === 'open-tomorrow'
                  ? t('admin.trading.setRateForTomorrowTitle', { date: dailyStatus.targetDate })
                  : t('admin.trading.setRateForTodayTitle', { date: dailyStatus?.targetDate ?? '' })}
              </p>
            </div>
            <div className="px-4 py-4 space-y-3">
              <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                {dailyStatus?.windowState === 'open-tomorrow'
                  ? t('admin.trading.setDailyHintTomorrow')
                  : t('admin.trading.setDailyHint')}
              </p>

              {dailyStatus?.isFresh && !dailyStatus.isLocked && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-300/90 leading-relaxed">
                  {t('admin.trading.freshStateHint')}
                </div>
              )}

              {dailyStatus?.isLocked && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-[11px] text-rose-300/90 leading-relaxed">
                  {dailyStatus.lockReason ?? t('admin.trading.lockedHint')}
                </div>
              )}

              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('admin.trading.rateRangeLabel')}
                </p>
                <p className="text-[10px] text-muted-foreground/80 leading-tight">
                  {t('admin.trading.rateRangeHint')}
                </p>
                <div className="flex items-center gap-2">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground">
                      {t('admin.trading.rateMin')}
                    </p>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={profitRateMin}
                      onChange={(e) => setProfitRateMin(e.target.value)}
                      disabled={dailyStatus?.isLocked || distributing}
                      className="w-24 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      = {(parseFloat(profitRateMin) * 100 || 0).toFixed(2)}%
                    </p>
                  </div>
                  <span className="text-muted-foreground self-center mt-3">–</span>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground">
                      {t('admin.trading.rateMax')}
                    </p>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={profitRateMax}
                      onChange={(e) => setProfitRateMax(e.target.value)}
                      disabled={dailyStatus?.isLocked || distributing}
                      className="w-24 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      = {(parseFloat(profitRateMax) * 100 || 0).toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleDistributeClick}
                disabled={distributing || dailyStatus?.isLocked}
                className="gap-2"
              >
                {dailyStatus?.isLocked ? (
                  <Lock className="size-4" />
                ) : (
                  <TrendingUp className="size-4" />
                )}
                {distributing
                  ? t('admin.trading.setDailySetting')
                  : dailyStatus?.windowState === 'open-tomorrow'
                    ? t('admin.trading.setRateForTomorrow')
                    : dailyStatus?.targetRate
                      ? t('admin.trading.updateRate')
                      : t('admin.trading.setDailyAction')}
              </Button>
            </div>
          </div>

          {/* Confirm-before-distribute dialog */}
          <AlertDialog
            open={confirmDistOpen}
            onOpenChange={(v) => !distributing && setConfirmDistOpen(v)}
          >
            <AlertDialogContent className="bg-card border-border/80 shadow-2xl shadow-black/60">
              {(() => {
                const minNum = parseFloat(profitRateMin) || 0;
                const maxNum = parseFloat(profitRateMax) || 0;
                const avgNum = (minNum + maxNum) / 2;
                const minPct = (minNum * 100).toFixed(2);
                const maxPct = (maxNum * 100).toFixed(2);
                const avgPct = (avgNum * 100).toFixed(2);
                // Per-$100 illustration — "user with $100 in TRADING gets $X to $Y"
                const exMin = (minNum * 100).toFixed(2);
                const exMax = (maxNum * 100).toFixed(2);
                return (
                  <>
                    <AlertDialogHeader>
                      <div className="mx-auto mb-1 flex size-12 items-center justify-center rounded-full ring-4 ring-amber-500/30 bg-amber-500/10">
                        <AlertTriangle className="size-6 text-amber-400" />
                      </div>
                      <AlertDialogTitle className="text-center">
                        {t('admin.trading.confirmTitle')}
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-center">
                        {t('admin.trading.confirmDesc')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="rounded-lg border border-border/50 bg-muted/20 px-3.5 py-3 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          {t('admin.trading.confirmRangeRow')}
                        </span>
                        <span className="font-semibold tabular-nums">
                          {minPct}% – {maxPct}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          {t('admin.trading.confirmAvgRow')}
                        </span>
                        <span className="text-emerald-400 tabular-nums">
                          ~{avgPct}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t border-border/30 pt-1.5">
                        <span className="text-muted-foreground">
                          {t('admin.trading.confirmExampleRow')}
                        </span>
                        <span className="font-bold text-emerald-400 tabular-nums">
                          ${formatBalance(exMin)} – ${formatBalance(exMax)}
                        </span>
                      </div>
                      <div className="border-t border-border/30 pt-1.5 text-[11px] text-muted-foreground/90 leading-relaxed">
                        {t('admin.trading.applyAllBatches')}
                      </div>
                    </div>

                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={distributing}>
                        {t('common.cancel')}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        disabled={distributing}
                        onClick={(e) => {
                          e.preventDefault();
                          runDistribute();
                        }}
                      >
                        {distributing && <Loader2 className="size-4 animate-spin" />}
                        {distributing
                          ? t('admin.trading.setDailySetting')
                          : t('admin.trading.confirmAction')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </>
                );
              })()}
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {activeTab === 'presale' && <PresaleAdminTab />}

      {activeTab === 'reports' && <ReportsTab />}

      {activeTab === 'maintenance' && <MaintenanceTab />}

      {activeTab === 'logs' && (
        <AuditLogTab
          logs={logs}
          total={logsTotal}
          page={logsPage}
          onChangePage={setLogsPage}
        />
      )}

      {activeTab === 'mev' && <MevAdminSection />}
    </div>
  );
}
