import { useState } from 'react';
import { Megaphone, X, LogOut, UserCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { changeLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n';
import { useAuthStore } from '@/stores/auth.store';
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

interface AppMenuDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const telegramItems = [
  { label: 'Telegram Ann.', icon: Megaphone, href: 'https://t.me/BurgerTrading' },
];

// Use centralized language list from i18n config

export function AppMenuDrawer({ open, onOpenChange }: AppMenuDrawerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout, isAuthenticated } = useAuthStore();
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>('en');

  const handleLang = (code: SupportedLanguage) => {
    changeLanguage(code);
    setCurrentLang(code);
  };

  const handleLogout = () => {
    logout();
    onOpenChange(false);
    // Reset the URL so the next login starts clean instead of re-opening the
    // last-visited page. logout() only clears state; the router path is
    // otherwise left untouched (login is a modal, not a route).
    navigate('/dashboard', { replace: true });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="flex flex-col bg-card text-card-foreground right-0 top-0 bottom-0 fixed h-full w-full sm:w-72 rounded-none border-l border-border">
        {/* Header */}
        <DrawerHeader className="flex flex-row items-center justify-between border-b border-border/50 px-5 py-0 h-16">
          <div className="flex items-center">
            <img src="/burger-logo.svg" alt="Burger" className="h-7 w-auto" />
            <DrawerTitle className="sr-only">Burger</DrawerTitle>
          </div>
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DrawerClose>
        </DrawerHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Profile */}
          {isAuthenticated && (
            <div className="lg:hidden">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t('nav.account', 'Account')}
              </p>
              <button
                onClick={() => { navigate('/portfolio'); onOpenChange(false); }}
                className="flex min-w-[90%] items-center gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
              >
                <UserCircle className="size-5 shrink-0 text-primary" />
                {t('nav.portfolio')}
              </button>
            </div>
          )}

          {/* Telegram */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Telegram
            </p>
            <div className="grid grid-cols-2 gap-2">
              {telegramItems.map(({ label, icon: Icon, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onOpenChange(false)}
                  className="flex flex-col items-center gap-2 rounded-xl border border-border/50 bg-muted/30 p-4 text-center transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <span className="text-[11px] font-medium leading-tight text-muted-foreground">
                    {label}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('nav.language', 'Language')}
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLang(lang.code)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    currentLang === lang.code
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Logout */}
        {isAuthenticated && (
          <div className="shrink-0 border-t border-border/50 p-5">
            <button
              onClick={handleLogout}
              className="flex min-w-[90%] items-center justify-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10 hover:border-red-500/30"
            >
              <LogOut className="size-4" />
              {t('nav.logout')}
            </button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
