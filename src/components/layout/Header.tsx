import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import {
  ChevronDown,
  Sun,
  Moon,
  Plug,
  CircleUser,
  LayoutGrid,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { changeLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n';
import { useThemeStore } from '@/stores/theme.store';
import { useAuthStore } from '@/stores/auth.store';
import { useAuthModalStore } from '@/stores/auth-modal.store';
import { mainNavigation } from '@/config/navigation';

interface HeaderProps {
  onMenuClick: () => void;
}

function shortAddress(addr: string) {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(
    i18n.language as SupportedLanguage
  );
  const { theme, toggleTheme } = useThemeStore();
  const { isAuthenticated, user, profile } = useAuthStore();
  const { showLogin, showRegister } = useAuthModalStore();
  const accessToken = useAuthStore((s) => s.accessToken);

  const handleLanguageChange = (lang: SupportedLanguage) => {
    changeLanguage(lang);
    setCurrentLang(lang);
  };

  const navItems = mainNavigation
    .flatMap((s) => s.items)
    .filter((item) => !item.adminOnly || profile?.role === 'ADMIN');

  return (
    <header
      data-slot="header"
      className="sticky top-0 z-40 flex h-16 shrink-0 items-center border-b border-border bg-background/85 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65 sm:px-6"
    >
      {/* Logo + wordmark — "Burger" always visible, "Trading" subtitle
          hides on narrow phones (< sm) to save space for the auth chip. */}
      <NavLink to="/dashboard" className="flex shrink-0 items-center gap-2.5">
        <img src="/burger-logo.svg" alt="Burger" className="h-8 w-auto" />
        <span className="inline-flex items-baseline gap-2">
          <span className="font-cyber font-cyber-glow text-base sm:text-lg uppercase text-primary">Burger</span>
          <span className="hidden sm:inline-flex font-cyber text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Terminal</span>
        </span>
      </NavLink>

      {/* Desktop nav links — only when there is genuinely room for all items
          plus the right-side actions. The 6 uppercase cyber pills + logo +
          right cluster measure ~1200px, so they only fit at xl (1280px+).
          Below xl the BottomNav handles primary navigation. */}
      <nav className="ml-4 hidden items-center gap-0.5 xl:ml-8 xl:flex">
        {navItems.filter((i) => i.href).map((item) => {
          const isExternal = item.href.startsWith('http');
          if (isExternal) {
            const href = accessToken ? `${item.href}#t=${accessToken}` : item.href;
            return (
              <a
                key={item.href}
                href={href}
                className="font-cyber uppercase tracking-[0.12em] whitespace-nowrap shrink-0 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {t(item.labelKey)}
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
                  'font-cyber uppercase tracking-[0.12em] whitespace-nowrap shrink-0 rounded-full px-3 py-1.5 text-xs transition-colors',
                  isActive
                    ? 'bg-muted text-foreground font-cyber-glow'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )
              }
            >
              {t(item.labelKey)}
            </NavLink>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* Right actions — shrink-0 so the wallet/membership chip is never the
          element that gets squeezed or clipped when space is tight. */}
      <div className="flex shrink-0 items-center gap-1.5">
        {/* Theme toggle — desktop only */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          className="hidden md:inline-flex"
          aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </Button>

        {/* Language selector — desktop only */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="hidden items-center gap-1.5 px-2.5 md:inline-flex"
            >
              <span className="text-base leading-none">
                {SUPPORTED_LANGUAGES.find((l) => l.code === currentLang)?.flag ?? '🌐'}
              </span>
              <span className="text-sm font-medium">
                {currentLang.toUpperCase()}
              </span>
              <ChevronDown className="size-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40 max-h-80 overflow-y-auto">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {t('nav.language')}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SUPPORTED_LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={currentLang === lang.code ? 'font-semibold text-primary' : ''}
              >
                <span className="mr-2">{lang.flag}</span>
                {lang.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Connect / wallet CTA */}
        {isAuthenticated && user ? (
          <Button
            size="sm"
            variant="outline"
            className="rounded-full gap-1.5 px-4 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary h-auto py-1 shrink-0"
            onClick={showLogin}
          >
            <Plug className="size-3.5 shrink-0" />
            <div className="flex min-w-0 max-w-[9rem] flex-col items-start leading-none">
              {/* Prefer live `profile.rank` (refreshed via /auth/profile) over
                  the login-cached `user.rank` so a server-side rank change
                  (promotion/demotion) reflects without forcing logout+login. */}
              {(profile?.rank ?? user.rank) && (
                <span className="w-full truncate text-[9px] font-semibold uppercase tracking-widest opacity-70">
                  {(profile?.rank ?? user.rank).replace(/_/g, ' ')}
                </span>
              )}
              <span className="font-mono text-xs">
                {shortAddress(user.walletAddress)}
              </span>
            </div>
          </Button>
        ) : (
          <div className="flex items-center gap-1.5">
            {/* Register — hidden on mobile to reduce header crowding */}
            <Button
              size="sm"
              variant="ghost"
              className="hidden rounded-full px-4 sm:inline-flex"
              onClick={() => showRegister()}
            >
              <span className="font-semibold">{t('auth.register')}</span>
            </Button>
            {/* Login — icon-only on mobile, full label on sm+ */}
            <Button
              size="sm"
              className="rounded-full gap-1.5 px-3 sm:px-4"
              onClick={showLogin}
            >
              <CircleUser className="size-3.5" />
              <span className="hidden font-semibold sm:inline">{t('auth.login')}</span>
            </Button>
          </div>
        )}

        {/* Grid icon — opens community drawer */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <LayoutGrid className="size-4" />
        </Button>
      </div>
    </header>
  );
}
