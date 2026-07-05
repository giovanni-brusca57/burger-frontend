import { useTranslation } from 'react-i18next';
import { Loader2, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useModalStore } from '@/stores/modal.store';
import { cn } from '@/lib/utils';

/**
 * Global Modal — driven by `useModalStore`.
 *
 * Supports four modes:
 *  - `create`  : form dialog with Cancel / Submit buttons
 *  - `edit`    : form dialog with Cancel / Update buttons
 *  - `delete`  : danger confirmation with Cancel / Delete buttons
 *  - `detail`  : read-only view with a single Close button
 *
 * Usage (anywhere in the tree — no prop drilling):
 * ```ts
 * const { open } = useModalStore();
 *
 * open({
 *   type: 'create',
 *   title: 'Create User',
 *   content: <CreateUserForm />,
 *   onConfirm: async () => { await createUser(); },
 * });
 * ```
 */
export function Modal() {
  const { t } = useTranslation();
  const { isOpen, type, title, description, content, size, isLoading, close, onConfirm, onCancel } =
    useModalStore();

  const handleCancel = () => {
    onCancel?.();
    close();
  };

  const handleConfirm = async () => {
    if (!onConfirm) return;
    try {
      useModalStore.getState().setLoading(true);
      await onConfirm();
    } finally {
      useModalStore.getState().setLoading(false);
    }
  };

  const isDeleteType = type === 'delete';
  const isDetailType = type === 'detail';
  const isFormType = type === 'create' || type === 'edit';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent size={size} showCloseButton={!isLoading}>
        <DialogHeader>
          {/* Delete icon header */}
          {isDeleteType && (
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/10 sm:mx-0">
              <Trash2 className="size-6 text-destructive" />
            </div>
          )}

          <DialogTitle
            className={cn(isDeleteType && 'text-destructive')}
          >
            {title}
          </DialogTitle>

          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}

          {/* Delete: always show confirmation text */}
          {isDeleteType && !description && (
            <DialogDescription>
              {t('modal.deleteConfirmation')}
              <span className="mt-1 block font-medium text-destructive">
                {t('modal.deleteWarning')}
              </span>
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Modal body */}
        {content && (
          <div className="overflow-y-auto">{content}</div>
        )}

        {/* Footer */}
        <DialogFooter>
          {/* Detail: only a close button */}
          {isDetailType && (
            <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
              {t('common.close')}
            </Button>
          )}

          {/* Create / Edit */}
          {isFormType && (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleConfirm} disabled={isLoading}>
                {isLoading && <Loader2 className="size-4 animate-spin" />}
                {type === 'create' ? t('common.create') : t('common.save')}
              </Button>
            </>
          )}

          {/* Delete confirmation */}
          {isDeleteType && (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="size-4 animate-spin" />}
                {t('common.delete')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
