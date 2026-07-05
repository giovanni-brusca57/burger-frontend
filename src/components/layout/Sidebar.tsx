import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';

import { cn } from '@/lib/utils';
import { mainNavigation } from '@/config/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  /** Collapsed state — only shows icons when true */
  collapsed?: boolean;
  className?: string;
  onLogout?: () => void;
}

/**
 * Desktop sidebar navigation.
 * Supports collapsed (icon-only) and expanded modes.
 */
export function Sidebar({ collapsed = false, className, onLogout }: SidebarProps) {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.profile?.role);

  return (
    <aside
      data-slot="sidebar"
      className={cn(
        'flex h-full flex-col bg-sidebar text-sidebar-foreground',
        'transition-[width] duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Logo + wordmark */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-sidebar-border px-4',
          collapsed ? 'justify-center' : 'gap-2.5'
        )}
      >
        <img
          src="/burger-logo.svg"
          alt="Burger"
          className={cn(
            'w-auto drop-shadow-[0_4px_14px_rgba(249,115,22,0.45)]',
            collapsed ? 'h-7' : 'h-8'
          )}
        />
        {!collapsed && (
          <span className="text-base font-extrabold tracking-tight leading-none">
            <span className="text-gradient-primary">Burger</span>
            <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/50">
              Trading
            </span>
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {mainNavigation.map((section, sectionIdx) => {
          const visibleItems = section.items.filter(
            (item) => !item.adminOnly || role === 'ADMIN'
          );
          if (visibleItems.length === 0) return null;

          return (
          <div key={sectionIdx} className="space-y-1">
            {/* Section title */}
            {!collapsed && section.titleKey && (
              <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/50">
                {t(section.titleKey)}
              </p>
            )}
            {collapsed && section.titleKey && sectionIdx > 0 && (
              <Separator className="my-2 bg-sidebar-border" />
            )}

            {/* Nav items */}
            {visibleItems.map((item) => {
              const Icon = item.icon;

              return (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={item.href}
                      end={item.exact}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                          'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                          isActive
                            ? 'bg-sidebar-primary/15 text-sidebar-primary font-semibold'
                            : 'text-sidebar-foreground/70',
                          collapsed && 'justify-center px-0'
                        )
                      }
                    >
                      <Icon
                        className={cn(
                          'shrink-0',
                          collapsed ? 'size-5' : 'size-4'
                        )}
                      />
                      {!collapsed && (
                        <span className="truncate">{t(item.labelKey)}</span>
                      )}
                      {!collapsed && item.badge !== undefined && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-sidebar-primary px-1 text-[10px] font-semibold text-sidebar-primary-foreground">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right" className="font-medium">
                      {t(item.labelKey)}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </div>
          );
        })}
      </nav>

      {/* Footer — logout */}
      <div className={cn('shrink-0 border-t border-sidebar-border p-2')}>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={onLogout}
              className={cn(
                'w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                collapsed && 'justify-center px-0'
              )}
            >
              <LogOut className={cn('shrink-0', collapsed ? 'size-5' : 'size-4')} />
              {!collapsed && (
                <span className="truncate">{t('nav.logout')}</span>
              )}
            </Button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right" className="font-medium">
              {t('nav.logout')}
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </aside>
  );
}
