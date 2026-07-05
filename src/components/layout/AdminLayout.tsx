import { Outlet, useNavigate } from 'react-router-dom';
import { ShieldCheck, LogOut } from 'lucide-react';

import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Minimal layout for admin / control panel pages.
 * No user navigation, no wallet UI — just logo, admin identity, and logout.
 */
export function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/admin-login', { replace: true });
  };

  return (
    <TooltipProvider>
      <div className="flex h-dvh flex-col bg-background overflow-hidden">
        {/* Admin Header — minimal */}
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center border-b border-red-500/20 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
          <div className="flex items-center gap-3 shrink-0">
            <img src="/burger-logo.svg" alt="Burger" className="h-7 w-auto" />
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/30 px-2.5 py-1">
              <ShieldCheck className="size-3.5 text-red-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Control Panel</span>
            </div>
          </div>

          <div className="flex-1" />

          {/* Right: admin email + logout */}
          <div className="flex items-center gap-3">
            {user?.email && (
              <div className="hidden md:flex flex-col items-end leading-tight">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Logged in as</span>
                <span className="text-xs font-semibold text-foreground">{user.email}</span>
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleLogout}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400 gap-1.5"
            >
              <LogOut className="size-3.5" />
              Logout
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-3 py-4 sm:px-6 sm:py-6">
            <Outlet />
          </div>
        </main>

        {/* Minimal footer */}
        <footer className="shrink-0 border-t border-border/30 px-4 py-2 sm:px-6">
          <p className="text-[10px] text-muted-foreground/50 text-center">
            🔒 Restricted access · All actions are logged · Burger Terminal Control Panel
          </p>
        </footer>
      </div>

      <Toaster position="top-right" richColors closeButton duration={4000} />
    </TooltipProvider>
  );
}
