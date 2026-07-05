import { AlertCircle, CheckCircle2, TriangleAlert } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export type AlertDialogVariant = 'error' | 'warning' | 'success';

interface AppAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: AlertDialogVariant;
  title: string;
  description: string;
  /** Label for the confirm/action button. Defaults to "OK". */
  confirmLabel?: string;
  /** Label for the cancel button. If omitted, no cancel button is rendered. */
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const variantConfig: Record<
  AlertDialogVariant,
  {
    Icon: React.FC<React.SVGProps<SVGSVGElement>>;
    mediaClass: string;
    iconClass: string;
    actionVariant: React.ComponentProps<typeof AlertDialogAction>['variant'];
  }
> = {
  error: {
    Icon: AlertCircle,
    mediaClass: 'bg-destructive/10',
    iconClass: 'text-destructive',
    actionVariant: 'destructive',
  },
  warning: {
    Icon: TriangleAlert,
    mediaClass: 'bg-yellow-500/10',
    iconClass: 'text-yellow-600 dark:text-yellow-400',
    actionVariant: 'default',
  },
  success: {
    Icon: CheckCircle2,
    mediaClass: 'bg-green-500/10',
    iconClass: 'text-green-600 dark:text-green-400',
    actionVariant: 'default',
  },
};

/**
 * Reusable alert dialog with three semantic variants: error, warning, success.
 *
 * Pure props — no Zustand.
 *
 * ```tsx
 * <AppAlertDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   variant="error"
 *   title="Something went wrong"
 *   description="Please try again later."
 *   confirmLabel="Retry"
 *   cancelLabel="Cancel"
 *   onConfirm={handleRetry}
 * />
 * ```
 */
export function AppAlertDialog({
  open,
  onOpenChange,
  variant,
  title,
  description,
  confirmLabel = 'OK',
  cancelLabel,
  onConfirm,
  onCancel,
}: AppAlertDialogProps) {
  const { Icon, mediaClass, iconClass, actionVariant } = variantConfig[variant];

  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className={cn(mediaClass)}>
            <Icon className={cn('size-8', iconClass)} />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          {cancelLabel && (
            <AlertDialogCancel onClick={handleCancel}>
              {cancelLabel}
            </AlertDialogCancel>
          )}
          <AlertDialogAction variant={actionVariant} onClick={handleConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
