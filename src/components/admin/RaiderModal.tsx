import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { UserDetail } from '@/lib/admin';

interface Props {
  detail: UserDetail;
  amount: string;
  target: string;
  note: string;
  onChangeAmount: (v: string) => void;
  onChangeTarget: (v: string) => void;
  onChangeNote: (v: string) => void;
  onSetRaider: (isRaider: boolean) => void;
  onClose: () => void;
}

export function RaiderModal({
  detail, amount, target, note,
  onChangeAmount, onChangeTarget, onChangeNote,
  onSetRaider, onClose,
}: Props) {
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl p-5 w-96 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-bold">
          {detail.isRaider ? t('admin.raiderModal.editTitle') : t('admin.raiderModal.setTitle')}
        </p>
        <p className="text-[11px] text-muted-foreground">{detail.email}</p>

        <div className="space-y-2">
          <label className="text-[10px] font-semibold text-muted-foreground">
            {t('admin.raiderModal.freeDepositLabel')}
          </label>
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => onChangeAmount(e.target.value)}
            className="w-full rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-semibold text-muted-foreground">
            {t('admin.raiderModal.targetTurnoverLabel')}
          </label>
          <input
            type="number"
            min="0"
            value={target}
            onChange={(e) => onChangeTarget(e.target.value)}
            className="w-full rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-semibold text-muted-foreground">{t('admin.raiderModal.noteLabel')}</label>
          <input
            type="text"
            value={note}
            onChange={(e) => onChangeNote(e.target.value)}
            placeholder={t('admin.raiderModal.notePlaceholder')}
            className="w-full rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          {detail.isRaider && (
            <Button
              size="sm"
              variant="outline"
              className="text-red-400 border-red-500/30"
              onClick={() => onSetRaider(false)}
            >
              {t('admin.raiderModal.remove')}
            </Button>
          )}
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" onClick={() => onSetRaider(true)}>
            {detail.isRaider ? t('admin.raiderModal.update') : t('admin.raiderModal.set')}
          </Button>
        </div>
      </div>
    </div>
  );
}
