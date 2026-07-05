import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Wallet, TrendingUp, Network, Edit3, Zap, Copy, Check, Calendar, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
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
import { NetworkTreeView } from '@/components/network/NetworkTreeView';
import { UserHistorySection } from './UserHistorySection';
import type { UserDetail } from '@/lib/admin';
import { setUserRole } from '@/lib/admin';
import { formatBalance, shortAddress } from '@/lib/helpers';
import { RANKS, RANK_LABEL, RANK_COLOR } from '@/lib/constants';

const ROLES = ['USER', 'ADMIN'];

// BE wallet type → display label key + abbreviation
const WALLET_META: Record<string, { abbr: string; nameKey: string; color: string; ring: string; bg: string }> = {
  USDT:              { abbr: 'DW', nameKey: 'admin.detail.depositWalletName',           color: 'text-emerald-400', ring: 'ring-emerald-500/40', bg: 'bg-emerald-500/15' },
  PROFIT_NETWORK:    { abbr: 'PW', nameKey: 'admin.detail.networkProfitWalletName',     color: 'text-violet-400',  ring: 'ring-violet-500/40',  bg: 'bg-violet-500/15'  },
  PROFIT_INVESTMENT: { abbr: 'PF', nameKey: 'admin.detail.investmentProfitWalletName',  color: 'text-cyan-400',    ring: 'ring-cyan-500/40',    bg: 'bg-cyan-500/15'    },
  TRADING:           { abbr: 'TW', nameKey: 'admin.detail.tradingWalletName',           color: 'text-orange-400',  ring: 'ring-orange-500/40',  bg: 'bg-orange-500/15'  },
};

// Fixed display order. The BE creates wallet rows lazily, so we always render
// the full list with $0 for any wallet type the user hasn't materialised yet —
// keeps the panel layout consistent across users.
const WALLET_ORDER = ['USDT', 'PROFIT_INVESTMENT', 'PROFIT_NETWORK', 'TRADING'] as const;

interface Props {
  detail: UserDetail;
  loading: boolean;
  onClose: () => void;
  onChangeRank: (rank: string) => void;
  onOpenBalanceModal: (walletType: string) => void;
  onOpenRaiderModal: () => void;
  onDetailRefresh?: () => void;
}

export function UserDetailPanel({
  detail, loading, onClose, onChangeRank, onOpenBalanceModal, onOpenRaiderModal, onDetailRefresh,
}: Props) {
  const { t } = useTranslation();
  const [changingRole, setChangingRole] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  // Promotion to ADMIN is sensitive — gate it behind a confirmation dialog.
  // Demotion (ADMIN → USER) is fine to fire directly.
  const [promoteConfirmOpen, setPromoteConfirmOpen] = useState(false);

  async function applyRoleChange(role: string) {
    setChangingRole(true);
    try {
      await setUserRole(detail.id, role);
      toast.success(`Role changed to ${role}`);
      onDetailRefresh?.();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to change role');
    } finally {
      setChangingRole(false);
    }
  }

  function handleChangeRole(role: string) {
    if (role === detail.role) return;
    if (role === 'ADMIN') {
      // Open confirm dialog instead of firing immediately.
      setPromoteConfirmOpen(true);
      return;
    }
    applyRoleChange(role);
  }

  function handleCopyAddress() {
    if (!detail.walletAddress) return;
    navigator.clipboard.writeText(detail.walletAddress).then(() => {
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 1500);
    });
  }

  if (loading) {
    return (
      <div className="flex-1 min-w-0 flex h-32 items-center justify-center">
        <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Total assets across all wallets
  const totalAssets = detail.wallets.reduce((sum, w) => sum + (parseFloat(w.balance) || 0), 0);

  // Joined relative
  const joinedDate = new Date(detail.createdAt);
  const joinedFormatted = joinedDate.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div className="flex-1 min-w-0 space-y-3">
      {/* ── Hero header ──────────────────────────────────────────────────────── */}
      <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-4 space-y-3">
          {/* Email + close */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-base font-bold truncate">{detail.email}</p>
            <button
              onClick={onClose}
              className="shrink-0 p-1 rounded hover:bg-muted/40 transition-colors"
              aria-label="Close"
            >
              <X className="size-4 text-muted-foreground" />
            </button>
          </div>

          {/* Status pills row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Rank pill */}
            <span className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-muted/30',
              RANK_COLOR[detail.rank],
            )}>
              {RANK_LABEL[detail.rank]}
            </span>
            {/* Role pill */}
            <span className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
              detail.role === 'ADMIN'
                ? 'bg-primary/15 text-primary ring-1 ring-primary/40'
                : 'bg-muted/30 text-muted-foreground',
            )}>
              {detail.role}
            </span>
            {/* Raider pill — only when active */}
            {detail.isRaider && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 ring-1 ring-amber-500/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400">
                <Zap className="size-2.5" />
                {t('admin.detail.raiderActive')}
              </span>
            )}
            {/* Joined chip */}
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/20 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              <Calendar className="size-2.5" />
              {t('admin.detail.memberSince')} {joinedFormatted}
            </span>
          </div>

          {/* Wallet address + referrer */}
          <div className="grid sm:grid-cols-2 gap-2 text-[11px] pt-1 border-t border-border/30">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-muted-foreground shrink-0">{t('admin.detail.wallet')}:</span>
              <span className="font-mono text-[10px] truncate">{shortAddress(detail.walletAddress)}</span>
              <button
                type="button"
                onClick={handleCopyAddress}
                className="shrink-0 p-0.5 rounded hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Copy address"
              >
                {addressCopied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
              </button>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-muted-foreground shrink-0">{t('admin.detail.referrer')}:</span>
              <span className="font-medium truncate">{detail.referrerEmail ?? '—'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Actions: Rank + Role ─────────────────────────────────────────────── */}
      <Card className="border-border/40">
        <CardContent className="p-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('admin.detail.actions')}
          </p>
          {/* Rank */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-muted-foreground w-16 shrink-0">{t('admin.detail.rank')}</span>
            <div className="flex items-center gap-1 flex-wrap">
              {RANKS.map((r) => (
                <button
                  key={r}
                  onClick={() => onChangeRank(r)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors',
                    detail.rank === r
                      ? cn('bg-primary/15 ring-1 ring-primary/40', RANK_COLOR[r])
                      : 'bg-muted/20 text-muted-foreground hover:bg-muted/40',
                  )}
                >
                  {RANK_LABEL[r]}
                </button>
              ))}
            </div>
          </div>
          {/* Role */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-muted-foreground w-16 shrink-0">{t('admin.detail.role')}</span>
            <div className="flex items-center gap-1">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => handleChangeRole(r)}
                  disabled={changingRole}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors',
                    detail.role === r
                      ? 'bg-primary/15 text-primary ring-1 ring-primary/40'
                      : 'bg-muted/20 text-muted-foreground hover:bg-muted/40',
                    changingRole && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Wallets (list with total) ────────────────────────────────────────── */}
      <Card className="border-border/40">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-muted-foreground" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t('admin.detail.wallets')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('admin.detail.totalAssets')}</span>
              <span className="text-base font-extrabold tabular-nums">${formatBalance(totalAssets)}</span>
            </div>
          </div>
          <div className="divide-y divide-border/30 rounded-lg border border-border/30 overflow-hidden">
            {WALLET_ORDER.map((type) => {
              const meta = WALLET_META[type];
              const balance = detail.wallets.find((w) => w.type === type)?.balance ?? '0';
              return (
                <div key={type} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/10 transition-colors">
                  <span className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ring-1',
                    meta.bg, meta.ring, meta.color,
                  )}>
                    {meta.abbr}
                  </span>
                  <p className="flex-1 text-xs font-medium truncate">{t(meta.nameKey)}</p>
                  <p className="text-base font-extrabold tabular-nums">${formatBalance(balance)}</p>
                  <button
                    onClick={() => onOpenBalanceModal(type)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Edit3 className="size-2.5" /> {t('admin.detail.adjust')}
                  </button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Profit Breakdown (lifetime) ──────────────────────────────────────── */}
      <Card className="border-border/40">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-muted-foreground" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t('admin.detail.profitBreakdown')}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-orange-500/25 bg-orange-500/5 p-2.5 space-y-0.5">
              <p className="text-[9px] font-bold uppercase text-muted-foreground">{t('admin.detail.investment')}</p>
              <p className="text-lg font-extrabold text-orange-400 tabular-nums">
                ${formatBalance(
                  (parseFloat(detail.profitBreakdown.tradingProfit) +
                    parseFloat(detail.profitBreakdown.investmentProfit)).toFixed(6),
                )}
              </p>
              <p className="text-[9px] text-muted-foreground">{t('admin.detail.investmentDesc')}</p>
            </div>
            <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-2.5 space-y-0.5">
              <p className="text-[9px] font-bold uppercase text-muted-foreground">{t('admin.detail.network')}</p>
              <p className="text-lg font-extrabold text-emerald-400 tabular-nums">
                ${formatBalance(detail.profitBreakdown.networkProfit)}
              </p>
              <p className="text-[9px] text-muted-foreground">{t('admin.detail.networkDesc')}</p>
            </div>
            <div className="rounded-lg border border-violet-500/25 bg-violet-500/5 p-2.5 space-y-0.5">
              <p className="text-[9px] font-bold uppercase text-muted-foreground">{t('admin.detail.totalEarned')}</p>
              <p className="text-lg font-extrabold text-violet-400 tabular-nums">
                ${formatBalance(detail.profitBreakdown.totalEarned)}
              </p>
              <p className="text-[9px] text-muted-foreground">{t('admin.detail.allTime')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Deposit & Withdrawal history (recent ── per user) ─────────────────── */}
      <UserHistorySection userId={detail.id} />

      {/* ── Direct Referrals (no duplicate network totals — those live in Tree below) ── */}
      <Card className="border-border/40">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Network className="size-4 text-muted-foreground" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t('admin.detail.directReferrals')}
            </p>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: t('admin.detail.membership'), value: detail.directReferrals?.byRank?.MEMBERSHIP ?? 0, color: 'text-slate-400' },
              { label: t('admin.detail.leader'),     value: detail.directReferrals?.byRank?.LEADER ?? 0,     color: 'text-violet-400' },
              { label: t('admin.detail.gold'),       value: detail.directReferrals?.byRank?.GOLD_LEADER ?? 0, color: 'text-amber-400' },
              { label: t('admin.detail.diamond'),    value: detail.directReferrals?.byRank?.DIAMOND_LEADER ?? 0, color: 'text-cyan-400' },
            ].map((s) => (
              <div key={s.label} className="rounded-md bg-muted/10 border border-border/20 px-2 py-1.5 text-center">
                <p className={cn('text-sm font-extrabold tabular-nums leading-tight', s.color)}>{s.value}</p>
                <p className="text-[9px] text-muted-foreground leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Raider Status ────────────────────────────────────────────────────── */}
      <Card className={cn('border-border/40', detail.isRaider && 'border-amber-500/30 bg-amber-500/5')}>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className={cn('size-4', detail.isRaider ? 'text-amber-400' : 'text-muted-foreground')} />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t('admin.detail.raiderStatus')}
              </p>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={onOpenRaiderModal}>
              {detail.isRaider ? t('admin.detail.editRaider') : t('admin.detail.setAsRaider')}
            </Button>
          </div>
          {detail.isRaider ? (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-amber-500/10 p-2">
                  <p className="text-lg font-extrabold text-amber-400">${formatBalance(detail.raiderFreeAmount ?? '0')}</p>
                  <p className="text-[9px] text-muted-foreground">{t('admin.detail.freeAmount')}</p>
                </div>
                <div className="rounded-lg bg-muted/10 p-2">
                  <p className="text-lg font-extrabold text-foreground">${formatBalance(detail.raiderTargetTurnover ?? '0')}</p>
                  <p className="text-[9px] text-muted-foreground">{t('admin.detail.targetTurnover')}</p>
                </div>
                <div className="rounded-lg bg-emerald-500/10 p-2">
                  <p className="text-lg font-extrabold text-emerald-400">
                    ${formatBalance(detail.cleanTurnover ?? '0')}
                  </p>
                  <p className="text-[9px] text-muted-foreground">{t('admin.detail.cleanTurnover')}</p>
                </div>
              </div>
              {(() => {
                const curr = parseFloat(detail.cleanTurnover ?? '0');
                const tgt = parseFloat(detail.raiderTargetTurnover ?? '1500');
                const pct = tgt > 0 ? Math.min((curr / tgt) * 100, 100) : 0;
                return (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">{t('admin.detail.withdrawalProgress')}</span>
                      <span className={cn('font-bold', pct >= 100 ? 'text-emerald-400' : 'text-amber-400')}>
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', pct >= 100 ? 'bg-emerald-500' : 'bg-amber-500')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className={cn('text-[10px] font-bold', pct >= 100 ? 'text-emerald-400' : 'text-amber-400')}>
                      {pct >= 100 ? t('admin.detail.withdrawalUnlocked') : t('admin.detail.withdrawalLocked')}
                    </p>
                  </div>
                );
              })()}
              {detail.raiderNote && (
                <p className="text-[10px] text-muted-foreground italic border-t border-border/20 pt-1">
                  {t('admin.detail.raiderNote', { note: detail.raiderNote })}
                </p>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground italic">{t('admin.detail.notRaider')}</p>
          )}
        </CardContent>
      </Card>

      {/* ── Network Tree (owns the totals — no duplicate stats card) ─────────── */}
      <Card className="border-border/40">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Network className="size-4 text-muted-foreground" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t('admin.detail.networkTree')}
            </p>
          </div>
          <NetworkTreeView userId={detail.id} showRaiderBadge={true} />
        </CardContent>
      </Card>

      {/* ── Promote-to-Admin confirmation ─────────────────────────────────── */}
      <AlertDialog open={promoteConfirmOpen} onOpenChange={setPromoteConfirmOpen}>
        <AlertDialogContent className="bg-card border-border/80 shadow-2xl shadow-black/60">
          <AlertDialogHeader>
            <div className="mx-auto mb-1 flex size-12 items-center justify-center rounded-full ring-4 ring-primary/30 bg-primary/10">
              <ShieldAlert className="size-6 text-primary" />
            </div>
            <AlertDialogTitle className="text-center">
              {t('admin.detail.promoteAdminTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {t('admin.detail.promoteAdminDesc', { email: detail.email })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={changingRole}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={changingRole}
              onClick={(e) => {
                e.preventDefault();
                applyRoleChange('ADMIN');
                setPromoteConfirmOpen(false);
              }}
            >
              {t('admin.detail.promoteAdminConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
