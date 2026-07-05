import { useTranslation } from 'react-i18next';
import { Gift } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { formatBalance } from '@/lib/helpers';

interface Props {
  investmentProfitBalance: string;
  networkProfitBalance: string;
  loadingWallets: boolean;
  isAuthenticated: boolean;
}

/**
 * Profit Wallets card — mirrors the Portfolio "Profit Wallets" cyan tile
 * exactly: parent wallet-tile with two .wallet-mini child tiles inside
 * (Investment = cyan, Network = violet).
 */
export function ProfitWalletsCard({
  investmentProfitBalance,
  networkProfitBalance,
  loadingWallets,
  isAuthenticated,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="wallet-tile wallet-tile--cyan h-full">
      <div className="wallet-tile-head">
        <span className="wallet-tile-label">{t('dashboard.profitWallets')}</span>
        <div className="wallet-tile-badge">
          <Gift className="size-3.5" />
        </div>
      </div>

      <p className="font-mono text-[12.5px] tracking-wide text-muted-foreground/85 leading-snug">
        {t('dashboard.profitWalletsDesc')}
      </p>

      <div className="space-y-1.5 mt-auto">
        <div className="wallet-mini wallet-mini--cyan">
          <div className="flex flex-col gap-0.5">
            <span className="wallet-mini-label">{t('dashboard.profitInvestmentLabel')}</span>
            <span className="wallet-mini-desc">{t('portfolio.investmentProfitDesc', 'Trading returns')}</span>
          </div>
          {loadingWallets && isAuthenticated ? (
            <Skeleton className="h-5 w-16" />
          ) : (
            <span className="wallet-mini-amount">
              {isAuthenticated ? (
                <>
                  $<AnimatedNumber value={parseFloat(investmentProfitBalance) || 0} format={formatBalance} />
                </>
              ) : (
                '—'
              )}
            </span>
          )}
        </div>

        <div className="wallet-mini wallet-mini--violet">
          <div className="flex flex-col gap-0.5">
            <span className="wallet-mini-label">{t('dashboard.profitNetworkLabel')}</span>
            <span className="wallet-mini-desc">{t('portfolio.networkProfitDesc', 'Sponsor rewards & bonuses')}</span>
          </div>
          {loadingWallets && isAuthenticated ? (
            <Skeleton className="h-5 w-16" />
          ) : (
            <span className="wallet-mini-amount">
              {isAuthenticated ? (
                <>
                  $<AnimatedNumber value={parseFloat(networkProfitBalance) || 0} format={formatBalance} />
                </>
              ) : (
                '—'
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
