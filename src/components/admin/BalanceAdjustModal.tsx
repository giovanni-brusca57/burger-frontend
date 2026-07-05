import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Props {
  walletType: string;
  userEmail?: string;
  amount: string;
  operation: 'add' | 'set';
  onChangeAmount: (v: string) => void;
  onChangeOperation: (op: 'add' | 'set') => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function BalanceAdjustModal({
  walletType, userEmail, amount, operation,
  onChangeAmount, onChangeOperation, onConfirm, onClose,
}: Props) {
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl p-5 w-80 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-bold">{t('admin.balanceModal.title', { walletType })}</p>
        <p className="text-[11px] text-muted-foreground">{userEmail}</p>
        <div className="flex gap-2">
          {(['add', 'set'] as const).map((op) => (
            <button
              key={op}
              onClick={() => onChangeOperation(op)}
              className={cn(
                'flex-1 rounded-lg py-2 text-[11px] font-bold uppercase transition-colors',
                operation === op
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/20 text-muted-foreground',
              )}
            >
              {op}
            </button>
          ))}
        </div>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder={t('admin.balanceModal.amountPlaceholder')}
          value={amount}
          onChange={(e) => onChangeAmount(e.target.value)}
          className="w-full rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" className="flex-1" onClick={onConfirm}>
            {t('common.confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
}
