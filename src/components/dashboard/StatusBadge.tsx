import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export type StatusBadgeVariant =
  | 'active'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'primary';

interface StatusBadgeProps {
  variant?: StatusBadgeVariant;
  children: React.ReactNode;
  animated?: boolean;
  className?: string;
}

/**
 * Single, unified pill component for the dashboard. Drives color via tokenized
 * `.pill-{variant}` utilities — never hardcode pill styles elsewhere.
 */
export function StatusBadge({
  variant = 'active',
  children,
  animated = false,
  className,
}: StatusBadgeProps) {
  const cls = variant === 'active' ? 'pill-base pill-success' : `pill-base pill-${variant}`;
  return (
    <span className={cn(cls, className)}>
      {animated && <span className="pulse-dot" aria-hidden />}
      {children}
    </span>
  );
}

// Convenience wrappers preserved for callers that previously imported these.
export function ActiveBadge() {
  const { t } = useTranslation();
  return (
    <StatusBadge variant="active" animated>
      {t('dashboard.active')}
    </StatusBadge>
  );
}

export function OfflineBadge() {
  const { t } = useTranslation();
  return <StatusBadge variant="neutral">{t('dashboard.offline')}</StatusBadge>;
}
