import { useTranslation } from 'react-i18next';
import { FileClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminLogEntry } from '@/lib/admin';
import { TablePagination } from '@/components/common/TablePagination';

const PAGE_SIZE = 30;

interface Props {
  logs: AdminLogEntry[];
  total: number;
  page: number;
  onChangePage: (page: number) => void;
}

export function AuditLogTab({ logs, total, page, onChangePage }: Props) {
  const { t } = useTranslation();

  return (
    <Card className="border-border/40">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileClock className="size-4 text-muted-foreground" />
          <p className="text-sm font-bold">{t('admin.auditLog.title')}</p>
          <span className="text-[10px] text-muted-foreground">{t('admin.auditLog.total', { count: total })}</span>
        </div>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-6 text-center">{t('admin.auditLog.empty')}</p>
        ) : (
          <>
            <div className="space-y-1">
              {logs.map((log) => {
                const d = new Date(log.createdAt);
                const actionColor =
                  log.action.includes('ADJUST') ? 'text-amber-400 bg-amber-500/15' :
                  log.action.includes('RAIDER') ? 'text-orange-400 bg-orange-500/15' :
                  log.action.includes('RANK')   ? 'text-violet-400 bg-violet-500/15' :
                                                  'text-muted-foreground bg-muted/20';
                return (
                  <div key={log.id} className="flex items-start gap-3 rounded-lg border border-border/30 px-3 py-2 text-[11px]">
                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase', actionColor)}>
                      {log.action}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p>
                        <span className="font-bold text-foreground">{log.adminEmail}</span>
                        {log.targetEmail && (
                          <>
                            <span className="text-muted-foreground"> → </span>
                            <span className="font-semibold">{log.targetEmail}</span>
                          </>
                        )}
                      </p>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
                          {Object.entries(log.details)
                            .filter(([, v]) => v !== null && v !== undefined && v !== '')
                            .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}{' '}
                      {d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
            </div>
            <TablePagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={onChangePage}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
