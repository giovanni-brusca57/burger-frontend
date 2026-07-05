import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Wrench, Loader2, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useFeatureFlagsStore } from '@/stores/featureFlags.store';
import { FEATURE_KEYS, type FeatureKey } from '@/lib/featureFlags';

const PAGE_FLAGS: FeatureKey[] = [
  'dashboard',
  'my_wallet',
  'profile',
  'portfolio',
  'lucky_break',
  'presale',
];

const ACTION_FLAGS: FeatureKey[] = ['deposits', 'withdrawals', 'internal_transfers'];

export function MaintenanceTab() {
  const { t } = useTranslation();
  const flags = useFeatureFlagsStore((s) => s.flags);
  const fetched = useFeatureFlagsStore((s) => s.fetched);
  const fetchAll = useFeatureFlagsStore((s) => s.fetchAll);
  const updateFlag = useFeatureFlagsStore((s) => s.updateFlag);

  // Buffered admin notes — committed only on save, scoped per key.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editingKey, setEditingKey] = useState<FeatureKey | null>(null);
  const [savingKey, setSavingKey] = useState<FeatureKey | null>(null);

  useEffect(() => {
    if (!fetched) fetchAll();
  }, [fetched, fetchAll]);

  function getFlag(key: FeatureKey) {
    return flags.find((f) => f.key === key);
  }

  async function commit(key: FeatureKey, patch: { enabled?: boolean; message?: string }) {
    setSavingKey(key);
    try {
      await updateFlag(key, patch);
      toast.success(t('admin.maintenance.saved'));
    } catch (err: any) {
      toast.error(err?.message ?? t('admin.maintenance.saveError'));
    } finally {
      setSavingKey(null);
    }
  }

  function FlagRow({ k }: { k: FeatureKey }) {
    const f = getFlag(k);
    const enabled = f?.enabled ?? true;
    const note = f?.message ?? '';
    const isEditing = editingKey === k;
    const draft = drafts[k] ?? note;
    const saving = savingKey === k;

    return (
      <div
        className={cn(
          'group rounded-lg border bg-card/40 p-3.5 space-y-2 transition-colors',
          enabled ? 'border-border/40' : 'border-amber-500/40 bg-amber-500/5',
        )}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">
              {t(`admin.maintenance.flag.${k}.label`)}
            </p>
            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
              {t(`admin.maintenance.flag.${k}.desc`)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide leading-none',
                enabled
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-400',
              )}
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  enabled ? 'bg-emerald-400' : 'bg-amber-400',
                )}
              />
              {enabled ? t('admin.maintenance.statusOn') : t('admin.maintenance.statusOff')}
            </span>
            <Switch
              checked={enabled}
              disabled={saving}
              onCheckedChange={(v) => commit(k, { enabled: v })}
              aria-label={enabled ? t('admin.maintenance.toggleOff') : t('admin.maintenance.toggleOn')}
            />
          </div>
        </div>

        {/* Admin note — visible only when feature is OFF (note is what users see) */}
        {!enabled && (
          <div className="space-y-1.5 pt-1 border-t border-amber-500/20">
            {isEditing ? (
              <>
                <textarea
                  rows={2}
                  autoFocus
                  value={draft}
                  onChange={(e) => setDrafts((d) => ({ ...d, [k]: e.target.value }))}
                  placeholder={t('admin.maintenance.notePlaceholder')}
                  className="w-full rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-[11px] outline-none focus:border-primary resize-none"
                />
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="default"
                    disabled={saving || draft === note}
                    onClick={() => {
                      commit(k, { message: draft });
                      setEditingKey(null);
                    }}
                    className="h-7 text-[11px] gap-1"
                  >
                    {saving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                    {t('admin.maintenance.saveNote')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingKey(null);
                      setDrafts((d) => ({ ...d, [k]: note }));
                    }}
                    className="h-7 text-[11px] gap-1"
                  >
                    <X className="size-3" />
                    {t('common.cancel')}
                  </Button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditingKey(k)}
                className="flex items-start gap-1.5 text-[11px] text-left w-full p-1.5 -m-1.5 rounded hover:bg-muted/30 transition-colors"
              >
                <Pencil className="size-3 mt-0.5 shrink-0 text-muted-foreground/70" />
                <span className={cn('flex-1 leading-snug', note ? 'text-foreground/80' : 'text-muted-foreground/60 italic')}>
                  {note || t('admin.maintenance.notePlaceholder')}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Compact intro */}
      <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3.5 py-2.5">
        <Wrench className="size-3.5 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-[11px] leading-relaxed text-amber-200/90">
          {t('admin.maintenance.howItWorks')}
        </p>
      </div>

      <section className="space-y-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('admin.maintenance.pagesHeader')}
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {PAGE_FLAGS.map((k) => <FlagRow key={k} k={k} />)}
        </div>
      </section>

      <section className="space-y-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('admin.maintenance.actionsHeader')}
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ACTION_FLAGS.map((k) => <FlagRow key={k} k={k} />)}
        </div>
      </section>

      {!fetched && (
        <p className="text-[11px] text-muted-foreground">
          {t('admin.maintenance.loading')}
        </p>
      )}
      {fetched && flags.length === 0 && (
        <p className="text-[11px] text-amber-400">
          {t('admin.maintenance.beNotReady')}
        </p>
      )}
      {/* Sanity: confirm we covered every key */}
      {import.meta.env.DEV && FEATURE_KEYS.length !== PAGE_FLAGS.length + ACTION_FLAGS.length && (
        <p className="text-[10px] text-red-400">
          ⚠️ MaintenanceTab is missing some FEATURE_KEYS — update PAGE_FLAGS / ACTION_FLAGS.
        </p>
      )}
    </div>
  );
}
