import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Users, Loader2, Search, Calendar, Clock } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TablePagination } from '@/components/common/TablePagination';
import {
  getMevAdminUsers,
  getMevConfig,
  setMevConfig,
  type MevAdminUser,
  type MevConfig,
} from '@/lib/mev';
import { GrantAttemptsModal } from './GrantAttemptsModal';

function rankLabel(rank: string): string {
  const map: Record<string, string> = {
    MEMBERSHIP: 'Membership',
    LEADER: 'Leader',
    GOLD_LEADER: 'Gold Leader',
    DIAMOND_LEADER: 'Diamond Leader',
  };
  return map[rank] ?? rank;
}

const PAGE_SIZE = 10;

export function MevAdminSection() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<MevAdminUser[]>([]);
  const [config, setConfig] = useState<MevConfig | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [intervalInput, setIntervalInput] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [grantModal, setGrantModal] = useState<{ open: boolean; user: MevAdminUser | null }>({
    open: false,
    user: null,
  });

  const [search, setSearch] = useState('');
  const [rankFilter, setRankFilter] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchUsers = useCallback((s: string, r: string, p: number, signal?: AbortSignal) => {
    setLoadingUsers(true);
    getMevAdminUsers({ search: s || undefined, rank: r || undefined, limit: PAGE_SIZE, offset: p * PAGE_SIZE }, signal)
      .then((res) => { setUsers(res.data); setTotal(res.total); })
      .catch((err) => { if (err?.message !== 'canceled') toast.error(err?.message ?? 'Failed to load users'); })
      .finally(() => setLoadingUsers(false));
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    fetchUsers('', '', 0, ac.signal);
    getMevConfig(ac.signal)
      .then((c) => {
        setConfig(c);
        setIntervalInput(String(c.grantIntervalDays));
      })
      .catch(() => {})
      .finally(() => setLoadingConfig(false));
    return () => ac.abort();
  }, []);

  const debouncedFetch = useDebouncedCallback((s: string, r: string) => {
    setPage(0);
    fetchUsers(s, r, 0);
  }, 400);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    debouncedFetch(value, rankFilter);
  };

  const handleRankChange = (value: string) => {
    setRankFilter(value);
    setPage(0);
    fetchUsers(search, value, 0);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchUsers(search, rankFilter, newPage);
  };

  const handleSaveConfig = async () => {
    const days = parseInt(intervalInput, 10);
    if (!days || days < 1) return;
    setSavingConfig(true);
    try {
      const updated = await setMevConfig({ grantIntervalDays: days });
      setConfig(updated);
      toast.success(t('mev.adminConfigSaved'));
    } catch {
      toast.error(t('mev.adminSaveConfigError'));
    } finally {
      setSavingConfig(false);
    }
  };

  const handleGranted = (userId: string, newTotal: number) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, mevAttempts: newTotal } : u))
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{t('mev.adminPanel')}</h2>
        <Badge variant="secondary" className="text-[10px]">
          ADMIN
        </Badge>
      </div>

      {/* Config card */}
      <Card className="border-primary/30 bg-primary/5 shadow-sm">
        <CardHeader className="pb-3 pt-5">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15">
              <Settings className="size-3.5 text-primary" />
            </div>
            <CardTitle className="text-sm font-semibold">{t('mev.adminConfig')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pb-5">
          {loadingConfig ? (
            <div className="flex gap-4">
              <div className="h-16 w-40 animate-pulse rounded-lg bg-muted" />
              <div className="h-16 w-24 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-4">
              {/* Interval field */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3 text-primary" />
                  <p className="text-xs font-medium">{t('mev.adminGrantInterval')} {intervalInput} {t('mev.adminGrantIntervalDays')}</p>
                </div>
                <Input
                  className="h-9 w-24 border-primary/30 bg-background text-sm font-semibold focus-visible:ring-primary/30"
                  type="number"
                  min={1}
                  value={intervalInput}
                  onChange={(e) => setIntervalInput(e.target.value)}
                />
              </div>

              <Button
                size="sm"
                className="h-9 rounded-full px-5 font-semibold"
                onClick={handleSaveConfig}
                disabled={savingConfig}
              >
                {savingConfig ? (
                  <>
                    <Loader2 className="size-3 animate-spin" />
                    {t('mev.adminSavingConfig')}
                  </>
                ) : (
                  t('mev.adminSaveConfig')
                )}
              </Button>

              {/* Last granted pill */}
              {config?.lastGrantedAt && (
                <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5">
                  <Clock className="size-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {t('mev.adminLastGranted')}:{' '}
                    <span className="font-medium text-foreground">
                      {new Date(config.lastGrantedAt).toLocaleDateString()}
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users table */}
      <Card>
        <CardHeader className="pb-3 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Users className="size-3.5 text-muted-foreground" />
              <CardTitle className="text-sm">{t('mev.adminUsers')}</CardTitle>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder={t('mev.adminSearch')}
                  className="h-7 w-44 rounded-md border border-border bg-muted/30 pl-7 pr-3 text-xs outline-none placeholder:text-muted-foreground/60 focus:border-ring"
                />
              </div>
              {/* Rank filter */}
              <select
                value={rankFilter}
                onChange={(e) => handleRankChange(e.target.value)}
                className="h-7 rounded-md border border-border bg-muted/30 px-2 text-xs text-foreground outline-none focus:border-ring"
              >
                <option value="">{t('mev.adminFilterRank')}</option>
                <option value="MEMBERSHIP">Membership</option>
                <option value="LEADER">Leader</option>
                <option value="GOLD_LEADER">Gold Leader</option>
                <option value="DIAMOND_LEADER">Diamond Leader</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    {t('mev.adminColEmail')}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    {t('mev.adminColRank')}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    {t('mev.adminColAttempts')}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                    {t('mev.adminColActions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td colSpan={4} className="px-3 py-2">
                        <div className="h-4 animate-pulse rounded bg-muted" />
                      </td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                      {t('common.noData')}
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2">{u.email}</td>
                      <td className="px-3 py-2">{rankLabel(u.rank)}</td>
                      <td className="px-3 py-2 font-semibold">{u.mevAttempts}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 gap-1 px-2 text-[10px]"
                          onClick={() => setGrantModal({ open: true, user: u })}
                        >
                          {t('admin.grantConfirm')}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {total > 0 && (
            <TablePagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              loading={loadingUsers}
              onPageChange={handlePageChange}
            />
          )}
        </CardContent>
      </Card>

      <GrantAttemptsModal
        open={grantModal.open}
        onOpenChange={(v) => setGrantModal((prev) => ({ ...prev, open: v }))}
        user={grantModal.user}
        onGranted={handleGranted}
      />
    </div>
  );
}
