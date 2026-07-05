import { Send } from 'lucide-react';

export function Footer() {
  return (
    <footer className="hidden border-t border-border md:block">
      <div className="container mx-auto flex items-center justify-between px-4 py-3 sm:px-6">
        <p className="flex items-center gap-2 text-xs text-muted-foreground/60">
          <img src="/burger-logo.svg" alt="" className="h-4 w-auto opacity-80" />
          <span>
            © {new Date().getFullYear()} Burger Terminal — Fresh-stacked MEV. All rights reserved.
          </span>
        </p>
        <a
          href="https://t.me/BurgerTrading"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Telegram"
          className="flex size-7 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:text-primary"
        >
          <Send className="size-3.5" />
        </a>
      </div>
    </footer>
  );
}
