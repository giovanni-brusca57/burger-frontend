import { useState, useEffect } from 'react';
import { ClipboardPaste, Loader2, CheckCircle2, Clock, XCircle, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { submitDeposit, getDepositHistory, type Deposit } from '@/lib/deposit';

const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/;
const MAX_DEPOSIT_TOTAL = 500;

interface SubmitDepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDepositSubmitted?: () => void;
}

export function SubmitDepositModal({
  open,
  onOpenChange,
  onDepositSubmitted,
}: SubmitDepositModalProps) {
  const { t } = useTranslation();

  const [txHash, setTxHash] = useState('');
  const [hasBlurred, setHasBlurred] = useState(false);
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Deposit | null>(null);

  const [quotaTotal, setQuotaTotal] = useState<number | null>(null);
  const quotaExceeded = quotaTotal !== null && quotaTotal >= MAX_DEPOSIT_TOTAL;
  void (quotaTotal !== null ? Math.max(0, MAX_DEPOSIT_TOTAL - quotaTotal) : null);

  // Fetch deposit history to check quota on open
  useEffect(() => {
    if (!open) return;
    getDepositHistory()
      .then((deposits) => {
        const total = deposits
          .filter((d) => d.status === 'COMPLETED')
          .reduce((sum, d) => sum + parseFloat(d.amount), 0);
        setQuotaTotal(total);
      })
      .catch(() => setQuotaTotal(0));
  }, [open]);

  // Reset all state when modal closes
  useEffect(() => {
    if (!open) {
      setTxHash('');
      setHasBlurred(false);
      setApiError('');
      setLoading(false);
      setResult(null);
      setQuotaTotal(null);
    }
  }, [open]);

  const isValidFormat = TX_HASH_REGEX.test(txHash);
  const showFormatError = hasBlurred && txHash.length > 0 && !isValidFormat;
  const canSubmit = txHash.length > 0 && isValidFormat && !loading;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTxHash(e.target.value);
    if (apiError) setApiError('');
  };

  const handleBlur = () => {
    setHasBlurred(true);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setTxHash(text.trim());
      if (apiError) setApiError('');
    } catch {
      toast.error(t('wallet.copyError'));
    }
  };

  const resolveApiError = (err: unknown): string => {
    // Our axios interceptor normalizes errors to { status, message, data } —
    // the original AxiosError shape is not preserved.
    const e = err as { status?: number; message?: string; response?: { status?: number } };
    const status = e?.status ?? e?.response?.status;
    const msg = e?.message ?? '';
    if (status === 409 || /already submitted/i.test(msg)) return t('wallet.submitErrDuplicate');
    if (status === 404) return t('wallet.submitErrNoWallet');
    if (status === 400) return t('wallet.submitErrInvalidHash');
    return t('wallet.submitErrGeneric');
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setApiError('');
    try {
      const deposit = await submitDeposit(txHash.trim());
      setResult(deposit);
    } catch (err) {
      setApiError(resolveApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (result) {
      onDepositSubmitted?.();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="default" className="gap-4">
        {/* ── Success / result state ── */}
        {result !== null ? (
          <>
            {result.status === 'PENDING' && (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="rounded-full bg-amber-500/15 p-3">
                  <Clock className="size-10 text-amber-500" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-base font-semibold">{t('wallet.submitPendingTitle')}</p>
                  <p className="text-sm text-muted-foreground">{t('wallet.submitPendingDesc')}</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-500">
                  {t('wallet.submitPendingBadge')}
                </span>
                <div className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                  <p className="text-[11px] font-mono text-muted-foreground break-all">
                    {result.txHash}
                  </p>
                </div>
                <Button className="w-full" onClick={handleClose}>
                  {t('wallet.submitClose')}
                </Button>
              </div>
            )}

            {result.status === 'COMPLETED' && (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="rounded-full bg-emerald-500/15 p-3">
                  <CheckCircle2 className="size-10 text-emerald-500" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-base font-semibold">{t('wallet.submitCompletedTitle')}</p>
                  <p className="text-sm text-muted-foreground">{t('wallet.submitCompletedDesc')}</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-500">
                  {t('wallet.submitCompletedBadge')}
                </span>
                <div className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                  <p className="text-[11px] font-mono text-muted-foreground break-all">
                    {result.txHash}
                  </p>
                </div>
                <Button className="w-full" onClick={handleClose}>
                  {t('wallet.submitClose')}
                </Button>
              </div>
            )}

            {result.status === 'FAILED' && (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="rounded-full bg-destructive/15 p-3">
                  <XCircle className="size-10 text-destructive" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-base font-semibold">{t('wallet.submitFailedTitle')}</p>
                  <p className="text-sm text-muted-foreground">{t('wallet.submitFailedDesc')}</p>
                </div>
                <Button className="w-full" onClick={handleClose}>
                  {t('wallet.submitClose')}
                </Button>
              </div>
            )}
          </>
        ) : (
          /* ── Input form ── */
          <>
            <DialogHeader>
              <DialogTitle>{t('wallet.submitDepositTitle')}</DialogTitle>
            </DialogHeader>

            {/* Quota exceeded state */}
            {quotaExceeded ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="rounded-full bg-destructive/15 p-3">
                  <ShieldAlert className="size-10 text-destructive" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-base font-semibold">{t('wallet.submitQuotaExceededTitle')}</p>
                  <p className="text-sm text-muted-foreground">{t('wallet.submitQuotaExceededDesc')}</p>
                </div>
                <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                  {t('common.close')}
                </Button>
              </div>
            ) : (
              <>
            {/* Info banner */}
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3.5 py-3 text-xs text-blue-400 leading-relaxed">
              <p>{t('wallet.submitDepositInfoBanner')}</p>
            </div>

            {/* Transaction hash input */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                {t('wallet.submitTxHashLabel')}
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <input
                  type="text"
                  className="flex-1 bg-transparent text-xs font-mono outline-none placeholder:text-muted-foreground/60 tracking-wide"
                  placeholder={t('wallet.submitTxHashPlaceholder')}
                  value={txHash}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={handlePaste}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t('wallet.submitPasteAriaLabel')}
                  disabled={loading}
                >
                  <ClipboardPaste className="size-4" />
                </button>
              </div>
              {/* Validation hint — always rendered to prevent layout shift */}
              <p
                className={
                  showFormatError
                    ? 'text-[11px] text-red-400'
                    : 'text-[11px] text-muted-foreground/60'
                }
              >
                {showFormatError
                  ? t('wallet.submitTxHashError')
                  : t('wallet.submitTxHashHint')}
              </p>
            </div>

            {/* API error banner */}
            {apiError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-xs text-destructive leading-relaxed">
                {apiError}
              </div>
            )}

            {/* Submit button */}
            <Button
              className="min-w-[90%]"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t('wallet.submitVerifying')}
                </>
              ) : (
                t('wallet.submitCta')
              )}
            </Button>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
