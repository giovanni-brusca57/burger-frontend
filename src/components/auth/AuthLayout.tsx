import { Bot, Globe2, Wallet, TrendingUp } from 'lucide-react';

/**
 * Full-screen auth layout — Burger Terminal branding.
 * Left: warm-ink branding panel with feature pills. Right: form panel.
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex bg-background">
      {/* ── Left panel: branding ── */}
      <div className="relative hidden flex-col items-center justify-center overflow-hidden lg:flex lg:w-[48%] bg-sidebar">
        <div className="bg-grid-soft absolute inset-0 opacity-[0.35]" />

        <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-9 px-12 text-center">
          <img
            src="/burger-logo.svg"
            alt="Burger"
            className="h-20 w-auto"
          />

          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Burger <span className="h1-highlight">Terminal</span>
            </h1>
            <p className="mt-3 max-w-[320px] text-sm leading-relaxed [font-family:Fraunces] italic text-[color:var(--gold)]/85">
              The fresh-stacked trading terminal — automated MEV strategies with multi-tier network rewards.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-2.5">
            {[
              { Icon: Bot,        label: 'Automated bot trading 24/7' },
              { Icon: Globe2,     label: 'Network sponsor rewards' },
              { Icon: Wallet,     label: 'USDT profit accumulation' },
              { Icon: TrendingUp, label: 'Rank-based income multiplier' },
            ].map(({ Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-2xl border border-sidebar-border surface-soft px-4 py-3 text-left"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-2xl border border-sidebar-border text-primary">
                  <Icon className="size-4" />
                </span>
                <span className="text-xs font-medium text-foreground/80">{label}</span>
              </div>
            ))}
          </div>

          <p className="eyebrow">
            // FRESH · FAST · STACKED
          </p>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex w-full flex-col items-center justify-center overflow-y-auto border-l border-border bg-background px-6 py-10 lg:w-[52%]">

        <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
          <img src="/burger-logo.svg" alt="Burger" className="h-12 w-auto" />
          <p className="eyebrow">
            // BURGER TERMINAL PLATFORM
          </p>
        </div>

        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
