import { useEffect, useState } from 'react';
import { Coins, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { formatBalance } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePresaleStore } from '@/stores/presale.store';
import { getPresaleStats, updatePresaleConfig, type PresaleStats } from '@/lib/presale';

export function PresaleAdminTab() {
  const invalidatePresaleStore = usePresaleStore((s) => s.invalidate);

  const [stats, setStats] = useState<PresaleStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  function loadStats() {
    setLoading(true);
    getPresaleStats()
      .then((s) => {
        setStats(s);
        setNewPrice(s.price);
      })
      .catch((err: any) =>
        toast.error(err?.message ?? 'Failed to load presale stats.'),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadStats();
  }, []);

  function handleUpdateClick() {
    const n = parseFloat(newPrice);
    if (isNaN(n) || n <= 0) {
      toast.error('Enter a valid price greater than 0.');
      return;
    }
    if (stats && n === parseFloat(stats.price)) {
      toast.error('New price is the same as the current price.');
      return;
    }
    setConfirmOpen(true);
  }

  async function runUpdate() {
    const n = parseFloat(newPrice);
    setSaving(true);
    try {
      await updatePresaleConfig({ priceUsd: n });
      toast.success(`Token price updated to $${formatBalance(n)}.`);
      // Drop the user-facing presale stats cache so the next visit to the
      // dashboard / presale page sees the new price right away.
      invalidatePresaleStore();
      setConfirmOpen(false);
      loadStats();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update token price.');
    } finally {
      setSaving(false);
    }
  }

  const currentPrice = stats ? parseFloat(stats.price) : 0;
  const parsedNewPrice = parseFloat(newPrice) || 0;
  const canSubmit =
    !loading && !saving && !!stats && parsedNewPrice > 0 && parsedNewPrice !== currentPrice;

  return (
    <div className="space-y-5 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        Manage the presale token price. Updates take effect immediately for all subsequent purchases.
      </p>

      {/* ── Current Presale Panel ─────────────────────────────────────── */}
      <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
        <div className="border-b border-border/40 bg-muted/20 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="size-3.5 text-muted-foreground" />
            <p className="text-[11px] font-semibold uppercase tracking-wide">Current Presale</p>
          </div>
          {stats && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                stats.isActive
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400',
              )}
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  stats.isActive ? 'bg-emerald-400' : 'bg-rose-400',
                )}
              />
              {stats.isActive ? 'Active' : 'Inactive'}
            </span>
          )}
        </div>
        <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Token</p>
            <p className="font-semibold">{stats?.tokenName ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Price</p>
            <p className="font-semibold tabular-nums">
              {stats ? `$${formatBalance(stats.price)}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Sold</p>
            <p className="font-semibold tabular-nums">
              {stats ? formatBalance(stats.totalSold) : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Remaining</p>
            <p className="font-semibold tabular-nums">
              {stats ? formatBalance(stats.remaining) : '—'}
            </p>
          </div>
          <div className="col-span-2 border-t border-border/30 pt-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Raised</p>
            <p className="text-sm font-bold text-primary tabular-nums">
              {stats ? `$${formatBalance(stats.totalRaised)}` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Set Price Form ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
        <div className="border-b border-border/40 bg-muted/20 px-4 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide">Set Token Price</p>
        </div>
        <div className="px-4 py-4 space-y-3">
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
            New price applies to all subsequent purchases. Existing purchases keep their original price.
          </p>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              New Price (USD per token)
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  disabled={loading || saving}
                  className="w-40 rounded-lg border border-border bg-muted/30 pl-7 pr-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed tabular-nums"
                />
              </div>
              {stats && parsedNewPrice > 0 && parsedNewPrice !== currentPrice && (
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  was ${formatBalance(stats.price)}
                </span>
              )}
            </div>
          </div>

          <Button onClick={handleUpdateClick} disabled={!canSubmit} className="gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Coins className="size-4" />}
            {saving ? 'Updating…' : 'Update Price'}
          </Button>
        </div>
      </div>

      {/* Confirm-before-update dialog */}
      <AlertDialog
        open={confirmOpen}
        onOpenChange={(v) => !saving && setConfirmOpen(v)}
      >
        <AlertDialogContent className="bg-card border-border/80 shadow-2xl shadow-black/60">
          <AlertDialogHeader>
            <div className="mx-auto mb-1 flex size-12 items-center justify-center rounded-full ring-4 ring-amber-500/30 bg-amber-500/10">
              <AlertTriangle className="size-6 text-amber-400" />
            </div>
            <AlertDialogTitle className="text-center">
              Confirm Token Price Update
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              This change applies to every purchase made from now on. Existing purchases keep their original price.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-lg border border-border/50 bg-muted/20 px-3.5 py-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current price</span>
              <span className="font-semibold tabular-nums">${formatBalance(currentPrice)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">New price</span>
              <span className="font-bold text-emerald-400 tabular-nums">
                ${formatBalance(parsedNewPrice)}
              </span>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                runUpdate();
              }}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? 'Updating…' : 'Confirm Update'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
