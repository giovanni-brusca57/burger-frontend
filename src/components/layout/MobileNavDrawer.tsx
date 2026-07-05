import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { mainNavigation } from '@/config/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

interface MobileNavDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogout?: () => void;
}

/**
 * Mobile navigation drawer — slides from the left.
 * Uses the vaul-based Drawer component.
 */
export function MobileNavDrawer({
  open,
  onOpenChange,
  onLogout,
}: MobileNavDrawerProps) {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.profile?.role);

  const handleNavClick = () => onOpenChange(false);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="left">
      <DrawerContent className="flex flex-col bg-sidebar text-sidebar-foreground w-full sm:w-72 max-h-full h-full rounded-none border-r border-sidebar-border">
        {/* Header */}
        <DrawerHeader className="flex flex-row items-center justify-between border-b border-sidebar-border px-4 py-0 h-16">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-bold text-sm">
              M
            </div>
            <DrawerTitle className="text-base font-semibold text-sidebar-foreground">
              Burger
            </DrawerTitle>
          </div>
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <X className="size-4" />
              <span className="sr-only">Close navigation</span>
            </Button>
          </DrawerClose>
        </DrawerHeader>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
          {mainNavigation.map((section, sectionIdx) => {
            const visibleItems = section.items.filter(
              (item) => !item.adminOnly || role === 'ADMIN'
            );
            if (visibleItems.length === 0) return null;

            return (
            <div key={sectionIdx} className="space-y-1">
              {section.titleKey && (
                <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/50">
                  {t(section.titleKey)}
                </p>
              )}
              {sectionIdx > 0 && !section.titleKey && (
                <Separator className="mb-2 bg-sidebar-border" />
              )}

              {visibleItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    end={item.exact}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                        isActive
                          ? 'bg-sidebar-primary/15 text-sidebar-primary font-semibold'
                          : 'text-sidebar-foreground/70'
                      )
                    }
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{t(item.labelKey)}</span>
                    {item.badge !== undefined && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-sidebar-primary px-1 text-[10px] font-semibold text-sidebar-primary-foreground">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            onClick={() => {
              onLogout?.();
              onOpenChange(false);
            }}
            className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4 shrink-0" />
            <span>{t('nav.logout')}</span>
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
