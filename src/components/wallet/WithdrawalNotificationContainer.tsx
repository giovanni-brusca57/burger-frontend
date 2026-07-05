/**
 * Top-right container that stacks WithdrawalNotificationCards.
 *
 * Mounted once in AppLayout. Hidden when no notifications. The store handles
 * lifecycle (spawn, poll, auto-dismiss); this component is purely presentational.
 */
import { useWithdrawalNotificationStore } from '@/stores/withdrawalNotifications.store';
import { WithdrawalNotificationCard } from './WithdrawalNotificationCard';

export function WithdrawalNotificationContainer() {
  const notifications = useWithdrawalNotificationStore((s) => s.notifications);
  if (notifications.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-[calc(100vw-2rem)] pointer-events-none"
      aria-live="polite"
      aria-label="Withdrawal notifications"
    >
      {notifications.map((n) => (
        <div key={n.id} className="pointer-events-auto">
          <WithdrawalNotificationCard notification={n} />
        </div>
      ))}
    </div>
  );
}
