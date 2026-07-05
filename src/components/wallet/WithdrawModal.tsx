import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  fmtAmount,
  withdrawUsdt,
  withdrawProfit,
  requestUsdtWithdrawalOtp,
  parseRaiderLockMessage,
  getRaiderStatus,
  type WithdrawUsdtResponse,
  type RaiderStatus,
} from '@/lib/wallet';
import { formatBalance } from '@/lib/helpers';
import { getPresaleEligibility, type PresaleEligibility } from '@/lib/presale';
import { useWalletStore } from '@/stores/wallet.store';
import { useAuthStore } from '@/stores/auth.store';
import { useWithdrawalNotificationStore } from '@/stores/withdrawalNotifications.store';
import {
  saveWithdrawIntent,
  loadWithdrawIntent,
  clearWithdrawIntent,
  otpRemainingSec,
  resendCooldownSec,
} from '@/lib/withdraw-intent';
import { type Wallet } from './wallet.types';
import { WithdrawSuccessView } from './withdraw/WithdrawSuccessView';
import { WithdrawCloseConfirm } from './withdraw/WithdrawCloseConfirm';
import { WithdrawPresaleBanner } from './withdraw/WithdrawPresaleBanner';
import { RaiderStatusBanner } from './withdraw/RaiderStatusBanner';
import { WithdrawAmountField } from './withdraw/WithdrawAmountField';
import { WithdrawAddressField } from './withdraw/WithdrawAddressField';
import { WithdrawFeeSummary } from './withdraw/WithdrawFeeSummary';
import { WithdrawOtpStep } from './withdraw/WithdrawOtpStep';

/** BE enforces $10 minimum on both USDT auto-withdraw and PROFIT withdraw. Mirror to fail-fast on FE. */
const MIN_WITHDRAWAL = 10;

type Phase = 'form' | 'awaiting' | 'success';

export function WithdrawModal({
  open,
  onOpenChange,
  wallet,
  withdrawAddress,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  wallet: Wallet | null;
  /** Pre-filled withdrawal address from user profile (if saved) */
  withdrawAddress?: string;
  onSuccess?: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { withdrawalFeeInfo: feeInfo, fetchWithdrawalFeeInfo, invalidate } = useWalletStore();
  const bootstrapWithdrawalNotifs = useWithdrawalNotificationStore((s) => s.bootstrap);
  const { user } = useAuthStore();
  const userId = user?.userId ?? '';
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [eligibility, setEligibility] = useState<PresaleEligibility | null>(null);
  const [raiderStatus, setRaiderStatus] = useState<RaiderStatus | null>(null);

  const [phase, setPhase] = useState<Phase>('form');
  const [otpCode, setOtpCode] = useState('');
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cooldownSec, setCooldownSec] = useState(0);
  const [expirySec, setExpirySec] = useState(0);
  const [result, setResult] = useState<WithdrawUsdtResponse | null>(null);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);

  const isUsdt = wallet?.apiType === 'USDT';

  useEffect(() => {
    if (!open) return;
    getPresaleEligibility().then(setEligibility).catch(() => {});
    getRaiderStatus().then(setRaiderStatus).catch(() => {});
    fetchWithdrawalFeeInfo();

    const pending = isUsdt && userId ? loadWithdrawIntent(userId) : null;
    if (pending) {
      setAmount(pending.amount);
      setAddress(pending.withdrawalAddress);
      setPhase('awaiting');
      setExpirySec(otpRemainingSec(pending));
      setCooldownSec(resendCooldownSec(pending));
    } else if (withdrawAddress) {
      setAddress(withdrawAddress);
    }
  }, [open, userId, isUsdt, withdrawAddress, fetchWithdrawalFeeInfo]);

  useEffect(() => {
    if (cooldownSec <= 0 && expirySec <= 0) return;
    const id = setInterval(() => {
      setCooldownSec((s) => Math.max(0, s - 1));
      setExpirySec((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownSec, expirySec]);

  useEffect(() => {
    if (phase !== 'awaiting' || expirySec > 0) return;
    if (cooldownSec > 0) return;
    clearWithdrawIntent();
    setPhase('form');
    setOtpCode('');
    toast.error(t('wallet.withdrawCodeExpired'));
  }, [phase, expirySec, cooldownSec, t]);

  const numAmount = parseFloat(amount) || 0;
  const availableNum = wallet ? parseFloat(wallet.balance) || 0 : 0;
  const isInsufficient = numAmount > availableNum;
  const isBelowMin = amount.length > 0 && numAmount > 0 && numAmount < MIN_WITHDRAWAL;
  // Fee uses BE-supplied percent + min-fee floor so it tracks the actual tier
  // ("5% unlocked" / "20% locked", floored at $3) instead of hardcoded values.
  // Falls back to 20% / $3 (worst case) until /wallet/withdrawal-fee-info resolves.
  const feePercent = feeInfo?.feePercent ?? 20;
  const minFeeUsd = feeInfo?.minFeeUsd ?? 3;
  const theoreticalFee = numAmount > 0 ? (numAmount * feePercent) / 100 : 0;
  const fee = numAmount > 0 ? Math.max(theoreticalFee, minFeeUsd) : 0;
  const toReceive = Math.max(0, numAmount - fee);
  // Floor activates when the percent-based fee is below the BE-enforced minimum.
  // breakEven = the smallest withdrawal where percent × amount equals the floor —
  // beyond that, users pay the rate instead of the flat minimum.
  const isAddressValid = /^0x[a-fA-F0-9]{40}$/.test(address.trim());
  const isPresaleEligible = eligibility?.eligible ?? false;
  const isOtpComplete = otpCode.length === 6 && /^\d{6}$/.test(otpCode);

  const formLocked = phase !== 'form';

  const resetState = () => {
    setAmount('');
    setAddress('');
    setOtpCode('');
    setPhase('form');
    setResult(null);
    setCooldownSec(0);
    setExpirySec(0);
  };

  /** Hard close — wipes state and persisted intent. Only call after explicit user intent. */
  const discardAndClose = () => {
    clearWithdrawIntent();
    resetState();
    setCloseConfirmOpen(false);
    onOpenChange(false);
  };

  const handleOpenChange = (v: boolean) => {
    if (v) {
      onOpenChange(true);
      return;
    }
    if (isUsdt && phase === 'awaiting' && expirySec > 0) {
      setCloseConfirmOpen(true);
      return;
    }
    resetState();
    onOpenChange(false);
  };

  const persistIntent = () => {
    if (!userId) return;
    saveWithdrawIntent({
      userId,
      amount,
      withdrawalAddress: address.trim(),
      otpRequestedAt: Date.now(),
    });
  };

  function describeError(err: any): string {
    const status = err?.status;
    const beMessage = err?.message ?? err?.data?.message;
    // 409 = new in-flight guard (BE rejects a 2nd withdraw while a previous one
    // is still PROCESSING — see mac-backend wallet.service.ts in-flight check).
    if (status === 409) return t('wallet.withdrawInFlight');
    // 429 now has two sources: the rolling 24h daily cap (HttpException with a
    // "Daily withdrawal limit"/"Remaining" message) AND a route-level throttler
    // at 5 req/min (NestJS ThrottlerException, generic message). Disambiguate
    // on the BE message so the rate-limit case doesn't masquerade as the cap.
    if (status === 429) {
      const isDailyCap =
        typeof beMessage === 'string' &&
        /daily withdrawal limit|remaining/i.test(beMessage);
      return t(isDailyCap ? 'wallet.withdrawDailyCapDesc' : 'wallet.withdrawRateLimited');
    }
    if (status === 503) return t('wallet.withdrawLiquidityFailed');
    const raider = parseRaiderLockMessage(beMessage);
    if (raider) return t('wallet.raiderWithdrawLocked', raider);
    if (status === 400 && typeof beMessage === 'string' && /otp|code/i.test(beMessage)) {
      return t('wallet.withdrawInvalidOtp');
    }
    return beMessage ?? t('wallet.withdrawError');
  }

  /** OTP-request errors — separate from the withdraw-confirm errors above. 429 here means resend cooldown. */
  function describeOtpRequestError(err: any): string {
    const status = err?.status;
    const beMessage = err?.message ?? err?.data?.message;
    if (status === 429) return t('wallet.withdrawOtpCooldown');
    const raider = parseRaiderLockMessage(beMessage);
    if (raider) return t('wallet.raiderWithdrawLocked', raider);
    return beMessage ?? t('wallet.withdrawError');
  }

  async function handleSendOtp() {
    if (requestingOtp) return;
    if (!amount || numAmount <= 0 || isBelowMin || !isAddressValid || isInsufficient) return;
    setRequestingOtp(true);
    try {
      await requestUsdtWithdrawalOtp();
      toast.success(t('wallet.withdrawCodeSentToEmail'));
      setPhase('awaiting');
      setCooldownSec(60);
      setExpirySec(10 * 60);
      persistIntent();
    } catch (err: any) {
      toast.error(describeOtpRequestError(err));
    } finally {
      setRequestingOtp(false);
    }
  }

  async function handleResendOtp() {
    if (requestingOtp || cooldownSec > 0) return;
    setRequestingOtp(true);
    try {
      await requestUsdtWithdrawalOtp();
      toast.success(t('wallet.withdrawCodeSentToEmail'));
      setCooldownSec(60);
      setExpirySec(10 * 60);
      persistIntent();
    } catch (err: any) {
      toast.error(describeOtpRequestError(err));
    } finally {
      setRequestingOtp(false);
    }
  }

  async function handleConfirm() {
    if (!wallet || submitting) return;
    setSubmitting(true);
    try {
      if (isUsdt) {
        if (!isOtpComplete) return;
        const res = await withdrawUsdt({
          amount,
          withdrawalAddress: address.trim(),
          otpCode,
        });
        setResult(res);
        setPhase('success');
        clearWithdrawIntent();
        invalidate();
        onSuccess?.();
      } else {
        await withdrawProfit({ amount, withdrawalAddress: address.trim() });
        toast.success(t('wallet.withdrawSuccess'));
        invalidate();
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (err: any) {
      // FE-side timeout (axios) or BE 503 from broadcast-but-not-confirmed:
      // the withdrawal is most likely still PROCESSING server-side. Don't
      // show an error — close the modal, clear the intent, and let the
      // floating notification take over via the store's bootstrap+poll.
      const isTimeout =
        err?.code === 'ECONNABORTED' ||
        err?.message?.toLowerCase?.().includes('timeout');
      const isBroadcastPending =
        err?.status === 503 &&
        typeof err?.message === 'string' &&
        /broadcast|not yet confirmed|still process/i.test(err.message);

      if (isUsdt && (isTimeout || isBroadcastPending)) {
        toast.info(t('wallet.notif.submittedToastTitle'), {
          description: t('wallet.notif.submittedToastDesc'),
        });
        clearWithdrawIntent();
        invalidate();
        onOpenChange(false);
        // Spawn / refresh notifications by re-querying PROCESSING withdrawals
        bootstrapWithdrawalNotifs();
        onSuccess?.();
      } else {
        toast.error(describeError(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!wallet) return null;

  if (phase === 'success' && result) {
    return (
      <WithdrawSuccessView
        open={open}
        result={result}
        walletUnit={wallet.unit}
        onClose={() => handleOpenChange(false)}
      />
    );
  }

  const disabledReasonLabel = isInsufficient
    ? t('wallet.withdrawInsufficientBalance')
    : isBelowMin
      ? t('wallet.withdrawMinAmountShort', { min: MIN_WITHDRAWAL })
      : !isAddressValid
        ? t('wallet.withdrawEnterValidAddress')
        : null;

  const tooltipMessage = isInsufficient
    ? t('wallet.withdrawInsufficientBalanceDesc', {
        unit: wallet.unit,
        available: `${formatBalance(wallet.balance)} ${wallet.unit}`,
      })
    : t('wallet.withdrawMinAmountDesc', {
        min: MIN_WITHDRAWAL,
        unit: wallet.unit,
      });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="default" className="gap-5">
        <DialogHeader>
          <DialogTitle>{t('wallet.withdrawTitle')}</DialogTitle>
        </DialogHeader>

        {eligibility && (
          <WithdrawPresaleBanner
            eligibility={eligibility}
            onGoToPresale={() => {
              navigate('/presale');
              onOpenChange(false);
            }}
          />
        )}

        {raiderStatus && <RaiderStatusBanner status={raiderStatus} />}

        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            {t('wallet.withdrawCurrency')}
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                wallet.color,
              )}
            >
              {wallet.unit.slice(0, 2)}
            </span>
            <span className="text-sm font-medium">{wallet.unit}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {t('wallet.transferAvailableBalance', {
                amount: fmtAmount(wallet.balance),
                unit: wallet.unit,
              })}
            </span>
          </div>
        </div>

        <WithdrawAmountField
          value={amount}
          onChange={setAmount}
          disabled={formLocked}
          walletBalance={wallet.balance}
          walletUnit={wallet.unit}
          isInsufficient={isInsufficient}
          isBelowMin={isBelowMin}
          minAmount={MIN_WITHDRAWAL}
          onMaxClick={() => setAmount(String(parseFloat(wallet.balance) || 0))}
        />

        <WithdrawAddressField
          value={address}
          onChange={setAddress}
          disabled={formLocked}
          savedAddress={withdrawAddress}
          onUseSaved={() => withdrawAddress && setAddress(withdrawAddress)}
          isAddressValid={isAddressValid}
        />

        <WithdrawFeeSummary
          feeInfo={feeInfo}
          feePercent={feePercent}
          fee={fee}
          toReceive={toReceive}
          walletUnit={wallet.unit}
          showUsdtCapHint={isUsdt}
        />

        {isUsdt && phase === 'awaiting' && (
          <WithdrawOtpStep
            otpCode={otpCode}
            onOtpChange={setOtpCode}
            expirySec={expirySec}
            cooldownSec={cooldownSec}
            requestingOtp={requestingOtp}
            onResend={handleResendOtp}
          />
        )}

        {isUsdt && phase === 'form' && (
          <Tooltip open={isInsufficient || isBelowMin ? undefined : false}>
            <TooltipTrigger asChild>
              <span className="inline-flex w-full justify-center">
                <Button
                  className="min-w-[90%] gap-2"
                  disabled={
                    !amount ||
                    numAmount <= 0 ||
                    isBelowMin ||
                    !isAddressValid ||
                    !isPresaleEligible ||
                    isInsufficient ||
                    requestingOtp
                  }
                  onClick={handleSendOtp}
                >
                  {requestingOtp && <Loader2 className="size-4 animate-spin" />}
                  {requestingOtp
                    ? t('wallet.withdrawSendingCode')
                    : !isPresaleEligible
                      ? t('wallet.withdrawBuyTokensToUnlock')
                      : (disabledReasonLabel ?? t('wallet.withdrawSendCode'))}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="flex items-center gap-1 text-xs">
                <AlertTriangle className="size-3" />
                {tooltipMessage}
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {isUsdt && phase === 'awaiting' && (
          <Button
            className="min-w-[90%] mx-auto gap-2"
            disabled={!isOtpComplete || submitting}
            onClick={handleConfirm}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {submitting ? t('wallet.withdrawProcessing') : t('wallet.withdrawConfirmFinal')}
          </Button>
        )}

        {!isUsdt && (
          <Tooltip open={isInsufficient || isBelowMin ? undefined : false}>
            <TooltipTrigger asChild>
              <span className="inline-flex w-full justify-center">
                <Button
                  className="min-w-[90%]"
                  disabled={
                    !amount ||
                    numAmount <= 0 ||
                    isBelowMin ||
                    !isAddressValid ||
                    !isPresaleEligible ||
                    isInsufficient ||
                    submitting
                  }
                  onClick={handleConfirm}
                >
                  {submitting
                    ? t('common.loading')
                    : !isPresaleEligible
                      ? t('wallet.withdrawBuyTokensToUnlock')
                      : (disabledReasonLabel ?? t('common.confirm'))}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="flex items-center gap-1 text-xs">
                <AlertTriangle className="size-3" />
                {tooltipMessage}
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </DialogContent>

      <WithdrawCloseConfirm
        open={closeConfirmOpen}
        onOpenChange={setCloseConfirmOpen}
        expirySec={expirySec}
        onDiscard={discardAndClose}
      />
    </Dialog>
  );
}
