import { cn } from '@/lib/utils';

interface Props {
  label: string;
  value: string | number;
  accent?: string;
  sub?: string;
}

export function StatBox({ label, value, accent, sub }: Props) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border/40 bg-muted/20 px-3 py-2.5">
      <p className={cn('text-xl font-extrabold tabular-nums', accent ?? 'text-foreground')}>{value}</p>
      <p className="text-[11px] font-medium text-foreground leading-tight">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
