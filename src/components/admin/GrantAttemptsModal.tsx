import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addMevAttempts, type MevAdminUser } from '@/lib/mev';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: MevAdminUser | null;
  onGranted: (userId: string, newTotal: number) => void;
}

export function GrantAttemptsModal({ open, onOpenChange, user, onGranted }: Props) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('1');
  const [loading, setLoading] = useState(false);

  const parsed = parseInt(amount, 10);
  const isValid = !isNaN(parsed) && parsed >= 1;

  const handleClose = (v: boolean) => {
    if (!v) setAmount('1');
    onOpenChange(v);
  };

  const handleSubmit = async () => {
    if (!user || !isValid) return;
    setLoading(true);
    try {
      const updated = await addMevAttempts({ userId: user.id, attempts: parsed });
      toast.success(
        t('admin.grantSuccess', { email: user.email, n: parsed, total: updated.mevAttempts })
      );
      onGranted(user.id, updated.mevAttempts);
      handleClose(false);
    } catch {
      toast.error(t('mev.adminGrantError'));
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t('admin.grantAttemptsTitle')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Target user */}
          <div className="rounded-lg border bg-muted/30 px-3 py-2.5 text-sm">
            <p className="text-xs text-muted-foreground">{t('admin.grantTargetUser')}</p>
            <p className="mt-0.5 font-medium">{user.email}</p>
            <p className="text-xs text-muted-foreground">
              {t('admin.grantCurrentAttempts')}: <span className="font-semibold text-foreground">{user.mevAttempts}</span>
            </p>
          </div>

          {/* Attempts input */}
          <div className="space-y-1.5">
            <Label htmlFor="grant-amount">{t('admin.grantAmount')}</Label>
            <Input
              id="grant-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="h-9"
            />
            {isValid && (
              <p className="text-xs text-muted-foreground">
                {t('admin.grantResultPreview', {
                  current: user.mevAttempts,
                  added: parsed,
                  total: user.mevAttempts + parsed,
                })}
              </p>
            )}
          </div>

          <Button
            className="min-w-[90%] gap-2"
            disabled={!isValid || loading}
            onClick={handleSubmit}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? t('common.loading') : t('admin.grantConfirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
