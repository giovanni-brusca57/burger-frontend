import { useEffect, type ReactNode } from 'react';

import { useAuthStore } from '@/stores/auth.store';
import { useFeatureFlagsStore } from '@/stores/featureFlags.store';
import type { FeatureKey } from '@/lib/featureFlags';
import { MaintenancePage } from '@/pages/MaintenancePage';

interface Props {
  flag: FeatureKey;
  children: ReactNode;
  /** Override the maintenance fallback (e.g. inline notice instead of full page). */
  fallback?: ReactNode;
}

/**
 * Hides `children` when its feature flag is OFF, showing the maintenance
 * screen instead. Admin users always bypass the gate so they can keep
 * verifying the page they just took down.
 *
 * On first mount, blocks render with a small spinner until the store has
 * hydrated from BE — prevents the flash where the locked page briefly
 * appears before the gate kicks in. AppLayout pre-fetches flags on mount,
 * so this loader is rarely visible after the first render.
 */
export function FeatureGate({ flag, children, fallback }: Props) {
  const profileRole = useAuthStore((s) => s.profile?.role);
  const isEnabled = useFeatureFlagsStore((s) => s.isEnabled(flag));
  const getFlag = useFeatureFlagsStore((s) => s.getFlag);
  const fetched = useFeatureFlagsStore((s) => s.fetched);
  const fetchAll = useFeatureFlagsStore((s) => s.fetchAll);

  // Belt-and-suspenders: AppLayout already fires fetchAll, but trigger
  // it here too in case the gate mounts outside the layout (e.g. tests).
  useEffect(() => {
    if (!fetched) fetchAll();
  }, [fetched, fetchAll]);

  // Pre-hydration: render a spinner instead of children. Admins bypass
  // the wait too — there's no value in making them stare at a loader.
  if (!fetched && profileRole !== 'ADMIN') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <span className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isEnabled || profileRole === 'ADMIN') {
    return <>{children}</>;
  }

  return <>{fallback ?? <MaintenancePage flag={getFlag(flag)} />}</>;
}
