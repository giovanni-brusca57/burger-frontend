import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, ArrowDown, AlertTriangle, TrendingUp } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type Wallet, type WalletApiType, INTERNAL_TRANSFER_ROUTES, WALLET_CONFIG } from './wallet.types';
import { fmtAmount, internalTransferWallet, parseRaiderLockMessage } from '@/lib/wallet';
import { formatBalance } from '@/lib/helpers';
import { useWalletStore } from '@/stores/wallet.store';
import { useAuthStore } from '@/stores/auth.store';

const AMOUNT_RE = /^\d+(\.\d{1,6})?$/;
const MIN_AMOUNT_WITHDRAW = 1;
const MIN_AMOUNT = 30;
const MAX_AMOUNT = 500;
/**
 * Per-rank TRADING wallet balance cap — mirrors `RANK_TRADING_CAP` in
 * burger-backend `deposit.service.ts`. DIAMOND_LEADER is uncapped on the BE; on
 * the FE we frame each transfer as a `currentBalance + DIAMOND_PER_ROUND_CAP`
 * ceiling so users see a concrete "+$500 this round" instead of "/ ∞".
 */
const RANK_TRADING_CAP: Record<string, number> = {
  MEMBERSHIP: 500,
  LEADER: 750,
  GOLD_LEADER: 1000,
  DIAMOND_LEADER: Number.POSITIVE_INFINITY,
};
const DIAMOND_PER_ROUND_CAP = 500;

export function InternalTransferModal({
  open,
  onOpenChange,
  wallet,
  allWallets,
  onSuccess,
  defaultToType,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  wallet: Wallet | null;
  allWallets: Wallet[];
  onSuccess?: () => void;
  /** Pre-select destination wallet (e.g. 'TRADING' when triggered from Reinvest button) */
  defaultToType?: WalletApiType;
}) {
  const { t } = useTranslation();
  const { profitSummary, fetchProfitSummary } = useWalletStore();
  // Prefer live `profile.rank` (refreshed via /auth/profile) over the
  // login-cached `user.rank`. Critical here because the cap calculation
  // below uses the rank — if the BE demoted the user mid-session, we must
  // apply the new (lower) cap immediately, not the cached older one.
  const userRank = useAuthStore((s) => s.profile?.rank ?? s.user?.rank);
  const [amount, setAmount] = useState('');
  const [toType, setToType] = useState<WalletApiType | null>(defaultToType ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  useEffect(() => {
    if (!open) return;
    setToType(defaultToType ?? null);
    fetchProfitSummary({ force: true });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // While the modal is open with TRADING as destination, poll the profit
  // summary every 10s so the quota gate (`blockedByQuota`) can lift as soon
  // as the bot ticks profit and fills the user's existing quota — otherwise
  // the user would have to close + reopen the modal to see the update.
  useEffect(() => {
    if (!open || toType !== 'TRADING') return;
    const id = setInterval(() => fetchProfitSummary({ force: true }), 10_000);
    return () => clearInterval(id);
  }, [open, toType]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!wallet) return null;

  const allowedRoutes = INTERNAL_TRANSFER_ROUTES[wallet.apiType];
  const toWallet = allWallets.find((w) => w.apiType === toType) ?? null;

  const numAmount = parseFloat(amount) || 0;
  const sourceBalance = parseFloat(wallet.balance) || 0;
  const isInsufficient = numAmount > sourceBalance;

  // BE caps total TRADING balance per rank — pre-validate when destination is TRADING.
  // Diamond is uncapped on BE; FE frames the cap as `currentBalance + $500` so
  // the user sees a concrete "+$500 this round" ceiling, never "/ ∞".
  const tradingBalance   = parseFloat(allWallets.find((w) => w.apiType === 'TRADING')?.balance ?? '0') || 0;
  const rankCap          = RANK_TRADING_CAP[userRank ?? 'MEMBERSHIP'] ?? 500;
  const tradingCap       = userRank === 'DIAMOND_LEADER'
    ? tradingBalance + DIAMOND_PER_ROUND_CAP
    : rankCap;
  const tradingRoomLeft  = Math.max(0, tradingCap - tradingBalance);
  const exceedsTradingCap = toType === 'TRADING' && tradingBalance + numAmount > tradingCap;

  // BE rejects reinvest into TRADING when the user still has remaining quota
  // to fill on their existing balance (wallet.service.ts: "Reinvest blocked").
  // Pre-flight this so the user sees an inline warning + disabled submit
  // instead of clicking and waiting for a 400 round-trip.
  // Skipped when maxQuota = 0 (no existing trading → initial reinvest is allowed).
  const quota          = profitSummary?.quota;
  const quotaMaxNum    = quota ? parseFloat(quota.maxQuota) : 0;
  const quotaRemaining = quota ? parseFloat(quota.remainingQuota) : 0;
  const blockedByQuota =
    toType === 'TRADING' && quotaMaxNum > 0 && !quota?.isExhausted;

  const checkType = toType === "USDT" ? MIN_AMOUNT_WITHDRAW : MIN_AMOUNT

  const isValidAmount =
    AMOUNT_RE.test(amount) && numAmount >= checkType && numAmount <= MAX_AMOUNT;
  const canSubmit =
    isValidAmount && toType !== null && !isInsufficient && !exceedsTradingCap
    && !blockedByQuota && !isLoading;

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setAmount('');
      setToType(null);
      setSucceeded(false);
    }
    onOpenChange(v);
  };

  const handleTransfer = async () => {
    if (!canSubmit || toType === null) return;
    setIsLoading(true);
    try {
      await internalTransferWallet({
        fromWalletType: wallet.apiType,
        toWalletType: toType,
        amount,
      });
      setSucceeded(true);
      onSuccess?.();
    } catch (err: any) {
      const raider = parseRaiderLockMessage(err?.message);
      if (raider) {
        toast.error(t('wallet.raiderWithdrawLocked', raider));
      } else {
        toast.error(err?.message ?? t('wallet.transferErrorGeneric'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="default" className="gap-5">
        <DialogHeader>
          <DialogTitle>{t('wallet.internalTransferTitle')}</DialogTitle>
        </DialogHeader>

        {succeeded ? (
          <div className="flex flex-col items-center justify-center gap-3 py-6">
            <CheckCircle2 className="size-12 text-green-500" />
            <p className="text-sm font-semibold">{t('wallet.transferSuccess')}</p>
            <p className="text-xs text-muted-foreground text-center">
              {t('wallet.internalTransferSuccessDesc', {
                amount,
                from: wallet.name,
                to: toWallet?.name ?? toType,
              })}
            </p>
            <Button variant="outline" className="mt-2" onClick={() => handleOpenChange(false)}>
              {t('common.close')}
            </Button>
          </div>
        ) : (
          <>
            {/* From wallet */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                {t('wallet.internalTransferFrom')}
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                    wallet.color
                  )}
                >
                  {wallet.abbr}
                </span>
                <span className="text-sm font-medium">{wallet.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {t('wallet.transferAvailableBalance', {
                    amount: fmtAmount(wallet.balance),
                    unit: wallet.unit,
                  })}
                </span>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center -my-2">
              <ArrowDown className="size-4 text-muted-foreground" />
            </div>

            {/* To wallet selector */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                {t('wallet.internalTransferTo')}
              </p>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${allowedRoutes.length}, 1fr)` }}>
                {allowedRoutes.map((destType) => {
                  const cfg = WALLET_CONFIG[destType];
                  const destWallet = allWallets.find((w) => w.apiType === destType);
                  return (
                    <button
                      key={destType}
                      type="button"
                      onClick={() => setToType(destType)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-center transition-colors',
                        toType === destType
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-muted/30 hover:border-primary/50'
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-7 items-center justify-center rounded-full text-[10px] font-bold',
                          cfg.color
                        )}
                      >
                        {cfg.abbr}
                      </span>
                      <span className="text-xs font-medium">{cfg.name}</span>
                      {destWallet && (
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {fmtAmount(destWallet.balance)} {cfg.unit}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Capital withdrawal warning — shown when source is TRADING.
                BE allows TRADING→USDT but it lowers daily profit, quota cap, and may demote referrer rank. */}
            {wallet.apiType === 'TRADING' && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2.5 space-y-1">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-amber-400 shrink-0" />
                  <p className="text-[11px] font-semibold text-amber-300">{t('wallet.tradingWithdrawWarningTitle')}</p>
                </div>
                <p className="text-[11px] text-amber-400/80 leading-relaxed">
                  {t('wallet.tradingWithdrawWarningDesc')}
                </p>
              </div>
            )}

            {/* Profit Quota preview — shown when destination is TRADING. Driven by BE quota block. */}
            {toType === 'TRADING' && profitSummary?.quota && (() => {
              const multPct    = profitSummary.quota.maxBonusPercentage;
              const newTrading = Math.min(tradingCap, tradingBalance + numAmount);
              const newCap     = (newTrading * multPct) / 100;
              return (
                <div className="rounded-lg border border-violet-500/25 bg-violet-500/8 px-3 py-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="size-3.5 text-violet-400 shrink-0" />
                    <p className="text-[11px] font-semibold text-violet-300">{t('wallet.tradingQuotaTitle')}</p>
                  </div>
                  <p className="text-[11px] text-violet-400/80 leading-relaxed">
                    {t('wallet.tradingQuotaDesc')}
                  </p>
                  <div className="flex items-center justify-between pt-0.5 text-[11px]">
                    <span className="text-muted-foreground">{t('wallet.tradingAfterTransfer')}</span>
                    <span className="font-semibold tabular-nums">
                      ${formatBalance(newTrading)} <span className="text-muted-foreground/60">/ ${tradingCap}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-0.5 border-t border-violet-500/15">
                    <span className="text-muted-foreground">
                      {t('wallet.profitQuotaCap')} ({multPct}%)
                    </span>
                    <span className="text-sm font-bold text-violet-300 tabular-nums">
                      ${formatBalance(newCap)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Amount */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                {t('wallet.transferAmount')}
              </p>
              <div className={cn(
                'flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 transition-colors',
                isInsufficient || exceedsTradingCap || blockedByQuota ? 'border-red-500/50' : 'border-border',
              )}>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t('wallet.internalTransferAmountPlaceholder')}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                />
                <button
                  type="button"
                  onClick={() => setAmount(String(parseFloat(wallet.balance) || 0))}
                  className="text-xs font-semibold text-primary hover:text-primary/80"
                >
                  {t('wallet.transferAll')}
                </button>
              </div>
              {isInsufficient ? (
                <p className="flex items-center gap-1 text-[10px] font-semibold text-red-400 leading-tight">
                  <AlertTriangle className="size-3 shrink-0" />
                  {t('wallet.transferInsufficientDesc', {
                    available: `${formatBalance(wallet.balance)} ${wallet.unit}`,
                  })}
                </p>
              ) : exceedsTradingCap ? (
                <p className="flex items-center gap-1 text-[10px] font-semibold text-red-400 leading-tight">
                  <AlertTriangle className="size-3 shrink-0" />
                  {t('wallet.transferTradingCapDesc', {
                    room: `${formatBalance(tradingRoomLeft)}`,
                  })}
                </p>
              ) : blockedByQuota ? (
                <p className="flex items-center gap-1 text-[10px] font-semibold text-red-400 leading-tight">
                  <AlertTriangle className="size-3 shrink-0" />
                  {t('wallet.reinvestQuotaNotFilled', {
                    remaining: formatBalance(quotaRemaining.toFixed(6)),
                  })}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  {t('wallet.internalTransferAmountHint', { min: toType == "USDT" ? MIN_AMOUNT_WITHDRAW : MIN_AMOUNT, max: MAX_AMOUNT })}
                </p>
              )}
            </div>

            <Tooltip open={isInsufficient || exceedsTradingCap || blockedByQuota ? undefined : false}>
              <TooltipTrigger asChild>
                <span className="inline-flex w-full justify-center">
                  <Button className="min-w-[93%] gap-2" disabled={!canSubmit} onClick={handleTransfer}>
                    {isLoading && <Loader2 className="size-4 animate-spin" />}
                    {isLoading
                      ? t('wallet.transferring')
                      : isInsufficient
                        ? t('wallet.transferInsufficientShort')
                        : exceedsTradingCap
                          ? t('wallet.transferTradingCapShort')
                          : blockedByQuota
                            ? t('wallet.reinvestQuotaNotFilledShort')
                            : t('common.confirm')}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="flex items-center gap-1 text-xs">
                  <AlertTriangle className="size-3" />
                  {isInsufficient
                    ? t('wallet.transferInsufficientDesc', {
                        available: `${formatBalance(wallet.balance)} ${wallet.unit}`,
                      })
                    : t('wallet.transferTradingCapDesc', {
                        room: `${formatBalance(tradingRoomLeft)}`,
                      })}
                </p>
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
