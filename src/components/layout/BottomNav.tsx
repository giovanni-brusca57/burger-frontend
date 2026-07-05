import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';

import { cn } from '@/lib/utils';
import { mainNavigation } from '@/config/navigation';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Mobile bottom tab bar navigation.
 * Replaces the left drawer on small screens.
 * Hidden on md+ where the sidebar is shown.
 */
export function BottomNav() {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.profile?.role);

  const accessToken = useAuthStore((s) => s.accessToken);

  const items = mainNavigation
    .flatMap((s) => s.items)
    .filter((item) => !item.adminOnly || role === 'ADMIN')
    .filter((item) => !item.hideFromBottomNav);

  return (
    <nav
      data-slot="bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center border-t border-sidebar-border bg-sidebar xl:hidden"
    >
      {items.filter((i) => i.href).map((item) => {
        const Icon = item.icon;
        const isExternal = item.href.startsWith('http');
        const baseClass = 'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors text-sidebar-foreground/50 hover:text-sidebar-foreground';

        if (isExternal) {
          const href = accessToken ? `${item.href}#t=${accessToken}` : item.href;
          return (
            <a key={item.href} href={href} className={baseClass}>
              <Icon className="size-5 shrink-0 text-sidebar-foreground/50" />
              <span>{t(item.labelKey)}</span>
            </a>
          );
        }

        return (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.exact}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
                isActive
                  ? 'text-sidebar-primary'
                  : 'text-sidebar-foreground/50 hover:text-sidebar-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    'size-5 shrink-0 transition-colors',
                    isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/50'
                  )}
                />
                <span>{t(item.labelKey)}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
