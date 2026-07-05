import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
}

function buildPageWindows(current: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);

  const pages: (number | '...')[] = [0];

  const windowStart = Math.max(1, current - 1);
  const windowEnd = Math.min(totalPages - 2, current + 1);

  if (windowStart > 1) pages.push('...');
  for (let i = windowStart; i <= windowEnd; i++) pages.push(i);
  if (windowEnd < totalPages - 2) pages.push('...');

  pages.push(totalPages - 1);
  return pages;
}

export function TablePagination({
  page,
  pageSize,
  total,
  loading = false,
  onPageChange,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const pages = buildPageWindows(page, totalPages);
  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);

  return (
    <div className="flex items-center justify-between border-t border-border/40 px-1 pt-2">
      <span className="text-[10px] text-muted-foreground">
        {from}–{to} / {total}
      </span>
      <div className="flex items-center gap-0.5">
        <button
          className="flex size-7 items-center justify-center rounded text-[11px] font-semibold bg-muted/20 hover:bg-muted/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          disabled={page === 0 || loading}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-3.5" />
        </button>

        {pages.map((p, idx) =>
          p === '...' ? (
            <span key={`ellipsis-${idx}`} className="flex size-7 items-center justify-center text-[11px] text-muted-foreground select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              disabled={loading}
              className={cn(
                'size-7 rounded text-[11px] font-semibold transition-colors disabled:cursor-not-allowed',
                page === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/20 hover:bg-muted/40 text-foreground',
              )}
            >
              {p + 1}
            </button>
          )
        )}

        <button
          className="flex size-7 items-center justify-center rounded text-[11px] font-semibold bg-muted/20 hover:bg-muted/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          disabled={page >= totalPages - 1 || loading}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
