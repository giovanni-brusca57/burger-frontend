/**
 * DEV PREVIEW SEED
 *
 * Auto-fills the auth + wallet stores with mock data when the URL has
 * `?preview` query param, so the app can be browsed without a backend.
 *
 * Gated by `import.meta.env.DEV` — this file is tree-shaken from prod builds.
 * Import is also wrapped at the call site (main.tsx) with the same guard.
 */

interface ZustandLike<T> {
  setState: (partial: Partial<T>) => void;
  getState: () => T;
}

function readPreviewFlag(): boolean {
  try {
    return new URLSearchParams(window.location.search).has('preview')
      || sessionStorage.getItem('__burger_preview') === '1';
  } catch {
    return false;
  }
}

function persistFlag() {
  try {
    sessionStorage.setItem('__burger_preview', '1');
  } catch { /* sessionStorage may be unavailable in some embedded views */ }
}

// Mock network-tree response — keeps NetworkTreeView + useDirectNetworkStats
// populated in preview mode. Shape mirrors lib/auth.ts NetworkTreeResponse.
// Root user (op@burger.local · Gold Leader) is NOT in the tree — the tree
// starts at depth=1 (their 5 direct downlines).
const NETWORK_TREE_MOCK = {
  totalMembers: 13,
  maxDepth: 3,
  totalTurnover: '23640.0000',
  ranksCount: {
    MEMBERSHIP: 6,
    LEADER: 3,
    GOLD_LEADER: 2,
    DIAMOND_LEADER: 2,
  },
  tree: [
    {
      id: 'd01', email: 'downline01@burger.dev', walletAddress: '0xD000000000000000000000000000000000001D01',
      rank: 'LEADER', isRaider: false, depth: 1, tradingBalance: '850.0000',
      createdAt: new Date(Date.now() - 40 * 86400 * 1000).toISOString(),
      children: [
        {
          id: 'd01-a', email: 'alpha@burger.dev', walletAddress: '0xA0000000000000000000000000000000000ALPHA',
          rank: 'MEMBERSHIP', isRaider: false, depth: 2, tradingBalance: '120.0000',
          createdAt: new Date(Date.now() - 30 * 86400 * 1000).toISOString(),
          children: [],
        },
        {
          id: 'd01-b', email: 'beta@burger.dev', walletAddress: '0xB000000000000000000000000000000000000BETA',
          rank: 'MEMBERSHIP', isRaider: false, depth: 2, tradingBalance: '80.0000',
          createdAt: new Date(Date.now() - 28 * 86400 * 1000).toISOString(),
          children: [],
        },
        {
          id: 'd01-g', email: 'gamma@burger.dev', walletAddress: '0xG00000000000000000000000000000000000GAMM',
          rank: 'LEADER', isRaider: false, depth: 2, tradingBalance: '420.0000',
          createdAt: new Date(Date.now() - 25 * 86400 * 1000).toISOString(),
          children: [
            {
              id: 'd01-g-d', email: 'delta@burger.dev', walletAddress: '0xDEL0000000000000000000000000000000DELTA',
              rank: 'MEMBERSHIP', isRaider: false, depth: 3, tradingBalance: '40.0000',
              createdAt: new Date(Date.now() - 14 * 86400 * 1000).toISOString(),
              children: [],
            },
            {
              id: 'd01-g-e', email: 'epsilon@burger.dev', walletAddress: '0xEPS00000000000000000000000000000EPSILON',
              rank: 'MEMBERSHIP', isRaider: false, depth: 3, tradingBalance: '0.0000',
              createdAt: new Date(Date.now() - 8 * 86400 * 1000).toISOString(),
              children: [],
            },
          ],
        },
      ],
    },
    {
      id: 'd02', email: 'downline02@burger.dev', walletAddress: '0xD000000000000000000000000000000000002D02',
      rank: 'GOLD_LEADER', isRaider: false, depth: 1, tradingBalance: '2100.0000',
      createdAt: new Date(Date.now() - 38 * 86400 * 1000).toISOString(),
      children: [
        {
          id: 'd02-z', email: 'zeta@burger.dev', walletAddress: '0xZ000000000000000000000000000000000000ZETA',
          rank: 'DIAMOND_LEADER', isRaider: true, depth: 2, tradingBalance: '5000.0000',
          createdAt: new Date(Date.now() - 20 * 86400 * 1000).toISOString(),
          children: [],
        },
        {
          id: 'd02-e', email: 'eta@burger.dev', walletAddress: '0xETA0000000000000000000000000000000000ETA',
          rank: 'LEADER', isRaider: false, depth: 2, tradingBalance: '700.0000',
          createdAt: new Date(Date.now() - 19 * 86400 * 1000).toISOString(),
          children: [],
        },
      ],
    },
    {
      id: 'd03', email: 'downline03@burger.dev', walletAddress: '0xD000000000000000000000000000000000003D03',
      rank: 'MEMBERSHIP', isRaider: false, depth: 1, tradingBalance: '30.0000',
      createdAt: new Date(Date.now() - 22 * 86400 * 1000).toISOString(),
      children: [],
    },
    {
      id: 'd04', email: 'downline04@burger.dev', walletAddress: '0xD000000000000000000000000000000000004D04',
      rank: 'DIAMOND_LEADER', isRaider: false, depth: 1, tradingBalance: '12500.0000',
      createdAt: new Date(Date.now() - 36 * 86400 * 1000).toISOString(),
      children: [
        {
          id: 'd04-t', email: 'theta@burger.dev', walletAddress: '0xT00000000000000000000000000000000THETA',
          rank: 'GOLD_LEADER', isRaider: false, depth: 2, tradingBalance: '1800.0000',
          createdAt: new Date(Date.now() - 12 * 86400 * 1000).toISOString(),
          children: [],
        },
      ],
    },
    {
      id: 'd05', email: 'downline05@burger.dev', walletAddress: '0xD000000000000000000000000000000000005D05',
      rank: 'MEMBERSHIP', isRaider: false, depth: 1, tradingBalance: '0.0000',
      createdAt: new Date(Date.now() - 5 * 86400 * 1000).toISOString(),
      children: [],
    },
  ],
};

export function bootPreviewSeed() {
  if (!readPreviewFlag()) return;
  persistFlag();

  // Freeze raw fetch — most callers go through axios but a few might use fetch.
  window.fetch = () => new Promise(() => {});

  // Patch axios adapter — the project's HTTP layer is axios (XHR), so a fetch
  // override alone won't intercept `/auth/network-tree`. Instead we swap in a
  // mock adapter that returns NETWORK_TREE_MOCK for that endpoint and hangs
  // every other axios request silently.
  void import('@/lib/axios').then(({ default: axiosInstance }) => {
    axiosInstance.defaults.adapter = (config) => {
      const url = config.url ?? '';
      if (url.includes('/auth/network-tree')) {
        return Promise.resolve({
          data: NETWORK_TREE_MOCK,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          request: {},
        });
      }
      // Daily Jackpot — preview shows 1 attempt available so the wheel UI is testable
      if (url.includes('/jackpot/status')) {
        return Promise.resolve({
          data: {
            eligible: true,
            currentPeriod: 2,
            isSpun: false,
            isClaimed: false,
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          request: {},
        });
      }
      return new Promise(() => {});
    };
  });

  // 1. Auth — seed Gold Leader operator
  const authState = {
    state: {
      accessToken: 'preview',
      user: {
        userId: 'preview-user',
        email: 'op@burger.local',
        walletAddress: '0xBURGER0000000000000000000000000000DEAD',
        rank: 'GOLD_LEADER',
      },
      isAuthenticated: true,
    },
    version: 0,
  };
  localStorage.setItem('mac-auth', JSON.stringify(authState));

  // 2. Wallet store + profile — wait until the Zustand stores mount.
  const seedStores = () => {
    const w = window as unknown as {
      __walletStore?: ZustandLike<Record<string, unknown>>;
      __authStore?: ZustandLike<Record<string, unknown>>;
      __presaleStore?: ZustandLike<Record<string, unknown>>;
    };
    if (!w.__walletStore) {
      // Try again on next tick — store imports might not have run yet.
      requestAnimationFrame(seedStores);
      return;
    }

    const mkW = (
      apiType: string, name: string, abbr: string, color: string,
      actions: string[], primary: string, balance: string,
    ) => ({
      id: apiType.toLowerCase(),
      apiType, name, abbr, balance, unit: 'USDT', color, actions,
      primaryAction: primary,
    });

    const wallets = [
      mkW('USDT', 'Deposit Wallet', 'DW', 'bg-emerald-500/20 text-emerald-400',
        ['deposit', 'submit', 'internal-transfer', 'withdraw'], 'deposit', '1284.5230'),
      mkW('TRADING', 'Trading Wallet', 'TW', 'bg-amber-500/20 text-amber-400',
        ['internal-transfer'], 'internal-transfer', '500.0000'),
      mkW('PROFIT_INVESTMENT', 'Investment Profit', 'IP', 'bg-cyan-500/20 text-cyan-400',
        ['internal-transfer'], 'internal-transfer', '247.8400'),
      mkW('PROFIT_NETWORK', 'Network Profit', 'NP', 'bg-violet-500/20 text-violet-400',
        ['internal-transfer'], 'internal-transfer', '189.6740'),
    ];

    const now = Date.now();
    const iso = (h: number) => new Date(now - h * 3600 * 1000).toISOString();
    const tx = [
      { id: 'tx-001', walletType: 'USDT', type: 'DEPOSIT', amount: '500.0000', balanceAfter: '1284.5230',
        reference: '0xabc123ef4567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
        description: 'On-chain BSC deposit', createdAt: iso(2) },
      { id: 'tx-002', walletType: 'TRADING', type: 'INVESTMENT', amount: '200.0000', balanceAfter: '500.0000',
        reference: 'inv-9921', description: 'Stake into trading pool', createdAt: iso(5) },
      { id: 'tx-003', walletType: 'PROFIT_INVESTMENT', type: 'TRADING_PROFIT', amount: '12.4700', balanceAfter: '247.8400',
        reference: 'batch-1287', description: 'Batch #1287 · +2.49% yield', createdAt: iso(12) },
      { id: 'tx-004', walletType: 'PROFIT_NETWORK', type: 'SPONSOR_REWARD', amount: '8.7400', balanceAfter: '189.6740',
        reference: '0xUSER0000000000000000000000000000DOWN01',
        description: 'L1 sponsor reward · 10%', createdAt: iso(18),
        from: { userId: 'down1', email: 'down01@op.dev', walletAddress: '0xUSER0000000000000000000000000000DOWN01', level: 1, percentage: 10 } },
      { id: 'tx-005', walletType: 'PROFIT_NETWORK', type: 'BONUS', amount: '4.2000', balanceAfter: '180.9340',
        reference: '0xUSER0000000000000000000000000000DOWN02',
        description: 'L2 bonus · 5%', createdAt: iso(22),
        from: { userId: 'down2', email: 'down02@op.dev', walletAddress: '0xUSER0000000000000000000000000000DOWN02', level: 2, percentage: 5 } },
      { id: 'tx-006', walletType: 'USDT', type: 'WITHDRAWAL', amount: '100.0000', balanceAfter: '784.5230',
        reference: 'wd-44291', description: 'Withdraw to external BEP20', createdAt: iso(26),
        withdrawal: {
          id: 'wd-44291', walletType: 'USDT', amount: '100.0000', fee: '1.0000', netAmount: '99.0000',
          withdrawalAddress: '0xEXT00000000000000000000000000000000DEEF',
          status: 'COMPLETED',
          txHash: '0xfee0fee0fee0fee0fee0fee0fee0fee0fee0fee0fee0fee0fee0fee0fee0fee0',
          processedAt: iso(25),
        } },
      { id: 'tx-007', walletType: 'TRADING', type: 'TRANSFER_IN', amount: '50.0000', balanceAfter: '700.0000',
        reference: 'xfer-1132', description: 'From USDT wallet', createdAt: iso(30) },
      { id: 'tx-008', walletType: 'USDT', type: 'TRANSFER_OUT', amount: '50.0000', balanceAfter: '734.5230',
        reference: 'xfer-1132', description: 'To TRADING wallet', createdAt: iso(30) },
      { id: 'tx-009', walletType: 'PROFIT_INVESTMENT', type: 'COMPOUND', amount: '15.0000', balanceAfter: '235.3700',
        reference: 'cmp-887', description: 'Auto-compound to trading', createdAt: iso(44) },
      { id: 'tx-010', walletType: 'USDT', type: 'TOKEN_PURCHASE', amount: '30.0000', balanceAfter: '654.5230',
        reference: 'pre-552', description: '$BURG presale · 600 tokens @ $0.05', createdAt: iso(50) },
    ];

    w.__walletStore.setState({
      wallets,
      loadingWallets: false,
      walletsLastFetched: Date.now(),
      profitSummary: {
        totalProfit: '437.5140',
        todayProfit: '12.4700',
        weeklyProfit: '78.2300',
        monthlyProfit: '247.8400',
        quota: {
          maxQuota: '500.0000',
          totalReceived: '320.0000',
          progressPercentage: 64,
          isExhausted: false,
        },
      },
      txPages: new Map([[0, { data: tx, total: 28 }]]),
      txTotal: 28,
      txPage: 0,
      loadingTx: false,
    });

    w.__authStore?.setState({
      profile: {
        userId: 'preview-user',
        email: 'op@burger.local',
        walletAddress: '0xBURGER0000000000000000000000000000DEAD',
        rank: 'GOLD_LEADER',
        role: 'USER',
        isQualified: true,
        totalDirectDownline: 5,
        createdAt: new Date(now - 45 * 86400 * 1000).toISOString(),
      },
    });

    // 3. Presale store — round 1 active so the Buy Tokens button can be
    // enabled when user types a valid amount in preview mode.
    // Mirrors the BE presale_config defaults: 50M supply, 5M allocation.
    w.__presaleStore?.setState({
      stats: {
        isActive: true,
        price: '1',
        totalSold: '320000',
        presaleAllocation: '5000000',
        totalSupply: '50000000',
        totalRaised: '320000',
        round: 1,
        startTime: new Date(now - 7 * 86400 * 1000).toISOString(),
        endTime: new Date(now + 30 * 86400 * 1000).toISOString(),
      },
      loading: false,
      lastFetched: now,
    });

    addBadge();
  };

  function addBadge() {
    if (document.getElementById('__burger_preview_badge')) return;
    const el = document.createElement('div');
    el.id = '__burger_preview_badge';
    el.textContent = '● PREVIEW MODE (mock data)';
    Object.assign(el.style, {
      position: 'fixed', bottom: '12px', left: '12px', zIndex: '9999',
      padding: '4px 10px', borderRadius: '9999px',
      background: 'rgba(250, 204, 21, 0.14)',
      color: '#FACC15', fontSize: '11px', fontWeight: '700',
      fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em',
      border: '1px solid rgba(250, 204, 21, 0.4)',
      backdropFilter: 'blur(8px)',
      pointerEvents: 'none',
    } as CSSStyleDeclaration);
    document.body.appendChild(el);
  }

  // Kick off seeding — runs once Zustand stores mount.
  requestAnimationFrame(seedStores);
}
