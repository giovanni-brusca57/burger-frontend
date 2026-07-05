import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// ── Date helpers ──────────────────────────────────────────────────────────────
// The value contract is a calendar-day string `YYYY-MM-DD` (same as the native
// <input type="date"> it replaces). All math is done on year/month/day integers
// so we never touch UTC / toISOString and never shift a day across a timezone.

interface Ymd {
  y: number;
  /** 0-indexed month (Jan = 0), to line up with the Date constructor. */
  m: number;
  d: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

function parseYmd(value: string): Ymd | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return { y: +m[1], m: +m[2] - 1, d: +m[3] };
}

function toValue({ y, m, d }: Ymd): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function todayYmd(): Ymd {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
}

function sameDay(a: Ymd, b: Ymd): boolean {
  return a.y === b.y && a.m === b.m && a.d === b.d;
}

/** YYYY-MM-DD comparison via a sortable integer key (handles min/max bounds). */
function key({ y, m, d }: Ymd): number {
  return y * 10000 + m * 100 + d;
}

export interface DatePickerProps {
  /** Selected day as `YYYY-MM-DD`, or '' for none. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Inclusive bounds as `YYYY-MM-DD` (e.g. cap dateFrom by dateTo). */
  min?: string;
  max?: string;
  /** Extra classes for the trigger button (width, etc.). */
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

/**
 * Themed date picker — a Popover-anchored month calendar built on the app's
 * design tokens. Replaces the native `<input type="date">`, whose calendar
 * indicator renders invisibly on the dark theme and whose sizing/color can't be
 * controlled. Keyboard/locale-aware: month + weekday names come from the active
 * i18n language via Intl, so no extra translation keys are needed.
 */
export function DatePicker({
  value,
  onChange,
  placeholder,
  min,
  max,
  className,
  disabled,
  'aria-label': ariaLabel,
}: DatePickerProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => parseYmd(value), [value]);
  const minYmd = useMemo(() => (min ? parseYmd(min) : null), [min]);
  const maxYmd = useMemo(() => (max ? parseYmd(max) : null), [max]);

  // The month being viewed. Anchored to the selection, else today. Kept in local
  // state so navigating months doesn't require a selection.
  const [view, setView] = useState<{ y: number; m: number }>(() => {
    const base = selected ?? todayYmd();
    return { y: base.y, m: base.m };
  });

  // Re-anchor the view to the selection whenever the popover (re)opens.
  function handleOpenChange(next: boolean) {
    if (next) {
      const base = selected ?? todayYmd();
      setView({ y: base.y, m: base.m });
    }
    setOpen(next);
  }

  const today = todayYmd();

  // Locale-aware labels. Intl handles every language the app ships.
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        month: 'long',
        year: 'numeric',
      }).format(new Date(view.y, view.m, 1)),
    [i18n.language, view.y, view.m],
  );

  const weekdays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' });
    // 2024-01-07 is a Sunday — build Sun..Sat headers.
    return Array.from({ length: 7 }, (_, i) =>
      fmt.format(new Date(2024, 0, 7 + i)),
    );
  }, [i18n.language]);

  const triggerLabel = useMemo(() => {
    if (!selected) return placeholder ?? t('common.selectDate', 'Select date');
    return new Intl.DateTimeFormat(i18n.language, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(selected.y, selected.m, selected.d));
  }, [selected, placeholder, i18n.language, t]);

  // 6-week grid (42 cells) covering the visible month + leading/trailing days.
  const cells = useMemo(() => {
    const firstWeekday = new Date(view.y, view.m, 1).getDay(); // 0 = Sun
    const start = new Date(view.y, view.m, 1 - firstWeekday);
    return Array.from({ length: 42 }, (_, i) => {
      const dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      return { y: dt.getFullYear(), m: dt.getMonth(), d: dt.getDate() } as Ymd;
    });
  }, [view.y, view.m]);

  function isDisabled(day: Ymd): boolean {
    if (minYmd && key(day) < key(minYmd)) return true;
    if (maxYmd && key(day) > key(maxYmd)) return true;
    return false;
  }

  function pick(day: Ymd) {
    if (isDisabled(day)) return;
    onChange(toValue(day));
    setOpen(false);
  }

  function shiftMonth(delta: number) {
    setView((v) => {
      const dt = new Date(v.y, v.m + delta, 1);
      return { y: dt.getFullYear(), m: dt.getMonth() };
    });
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
          'inline-flex h-9 items-center gap-2 rounded-lg border border-border/80 bg-card px-2.5 text-xs text-foreground transition-colors',
          'hover:border-primary/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          !selected && 'text-muted-foreground',
          className,
        )}
      >
        <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-left tabular-nums">{triggerLabel}</span>
        {selected && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            aria-label={t('common.clear', 'Clear')}
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="grid size-4 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3" />
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="start" className="w-auto p-3">
        {/* Month navigation */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label={t('common.prevMonth', 'Previous month')}
            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-xs font-semibold capitalize tabular-nums">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label={t('common.nextMonth', 'Next month')}
            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-0.5">
          {weekdays.map((w, i) => (
            <div
              key={i}
              className="grid h-7 place-items-center text-[10px] font-medium uppercase text-muted-foreground"
            >
              {w}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            const inMonth = day.m === view.m;
            const isSel = selected ? sameDay(day, selected) : false;
            const isToday = sameDay(day, today);
            const off = isDisabled(day);
            return (
              <button
                key={i}
                type="button"
                disabled={off}
                onClick={() => pick(day)}
                className={cn(
                  'grid h-8 w-8 place-items-center rounded-md text-xs tabular-nums transition-colors',
                  inMonth ? 'text-foreground' : 'text-muted-foreground/40',
                  !off && 'hover:bg-accent hover:text-accent-foreground',
                  off && 'cursor-not-allowed opacity-30',
                  isToday && !isSel && 'ring-1 ring-inset ring-primary/40',
                  isSel &&
                    'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                )}
              >
                {day.d}
              </button>
            );
          })}
        </div>

        {/* Footer: jump to today */}
        <div className="mt-2 flex items-center justify-end border-t border-border/50 pt-2">
          <button
            type="button"
            onClick={() => pick(today)}
            className="rounded-md px-2 py-1 text-[11px] font-medium text-primary hover:bg-accent"
          >
            {t('common.today', 'Today')}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
