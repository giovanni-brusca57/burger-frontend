export type WalletAction = 'internal-transfer' | 'transfer' | 'deposit' | 'withdraw' | 'submit' | 'reinvest' | 'none';

/** Maps to BE WalletType enum: USDT | PROFIT_NETWORK | PROFIT_INVESTMENT | TRADING */
export type WalletApiType = 'USDT' | 'PROFIT_NETWORK' | 'PROFIT_INVESTMENT' | 'TRADING';

/** Allowed internal transfer routes (from → to) */
export const INTERNAL_TRANSFER_ROUTES: Record<WalletApiType, WalletApiType[]> = {
  USDT: ['TRADING'],
  PROFIT_NETWORK: ['USDT', 'TRADING'],
  PROFIT_INVESTMENT: ['USDT', 'TRADING'],
  TRADING: ['USDT'],
};

export interface Wallet {
  id: string;
  /** BE wallet type used for API calls */
  apiType: WalletApiType;
  name: string;
  /** Short abbreviation shown in avatar circle */
  abbr: string;
  balance: string;
  unit: string;
  color: string;
  actions: WalletAction[];
  primaryAction: WalletAction;
  address?: string;
}

/**
 * Static display config for each BE wallet type.
 * Balance is always populated at runtime from GET /wallet.
 */
export const WALLET_CONFIG: Record<WalletApiType, Omit<Wallet, 'balance'>> = {
  USDT: {
    id: 'usdt',
    apiType: 'USDT',
    name: 'Deposit Wallet',
    abbr: 'DW',
    unit: 'USDT',
    color: 'bg-emerald-500/20 text-emerald-400',
    actions: ['deposit', 'submit', 'internal-transfer', 'withdraw'],
    primaryAction: 'deposit',
  },
  PROFIT_NETWORK: {
    id: 'profit',
    apiType: 'PROFIT_NETWORK',
    name: 'Network Profit',
    abbr: 'NP',
    unit: 'USDT',
    color: 'bg-violet-500/20 text-violet-400',
    // 'reinvest' is injected dynamically by WalletAssets when quota is full
    actions: ['internal-transfer'],
    primaryAction: 'internal-transfer',
  },
  PROFIT_INVESTMENT: {
    id: 'profit-investment',
    apiType: 'PROFIT_INVESTMENT',
    name: 'Investment Profit',
    abbr: 'IP',
    unit: 'USDT',
    color: 'bg-cyan-500/20 text-cyan-400',
    actions: ['internal-transfer'],
    primaryAction: 'internal-transfer',
  },
  TRADING: {
    id: 'trading',
    apiType: 'TRADING',
    name: 'Trading Wallet',
    abbr: 'TW',
    unit: 'USDT',
    color: 'bg-orange-500/20 text-orange-400',
    actions: ['internal-transfer'],
    primaryAction: 'internal-transfer',
  },
};

/** Display order for wallet list */
export const WALLET_ORDER: WalletApiType[] = ['USDT', 'PROFIT_INVESTMENT', 'PROFIT_NETWORK', 'TRADING'];
