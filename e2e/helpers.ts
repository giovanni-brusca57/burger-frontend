import { type Page, type APIRequestContext, expect } from '@playwright/test';

const API_URL = 'http://localhost:3000';

// Legacy export kept for existing specs
export const TEST_USER = { email: 'test@test.com', password: 'test123456' };

// ── Seeder credentials (from BE prisma/seed-test-profit.ts) ──────────────────
export const USERS = {
  admin: { email: 'admin@test.com',  password: 'Test@123', rank: 'DIAMOND_LEADER', trading: 500 },
  userA: { email: 'usera@test.com',  password: 'Test@123', rank: 'LEADER',         trading: 200 },
  userB: { email: 'userb@test.com',  password: 'Test@123', rank: 'MEMBERSHIP',     trading: 100 },
  root:  { email: 'root@admin.com',  password: 'Root@123456', rank: 'ADMIN',       trading: 0   },
} as const;

// ── BE business constants (mirror from backend) ───────────────────────────────
export const BC = {
  MIN_DEPOSIT:         10,
  MIN_TRANSFER:        30,
  MAX_TRANSFER:        500,
  MIN_WITHDRAWAL:      10,
  MIN_FEE_USD:         3,
  FEE_PRE_RECOUP:      0.20,
  FEE_POST_RECOUP:     0.05,
  PROFIT_RATE_MIN:     0.006,
  PROFIT_RATE_MAX:     0.01,
  LUCKY_SMALL_PCT:     0.005,
  LUCKY_MEDIUM_PCT:    0.01,
  LUCKY_JACKPOT_PCT:   0.03,
  QUOTA_MULTIPLIER: {
    MEMBERSHIP:     1.0,
    LEADER:         1.5,
    GOLD_LEADER:    2.0,
    DIAMOND_LEADER: 3.0,
  } as Record<string, number>,
  RANK_THRESHOLDS: {
    LEADER:         { directs: 3, trading: 30  },
    GOLD_LEADER:    { directs: 3, trading: 100 },
    DIAMOND_LEADER: { directs: 3, rank: 'LEADER' },
  },
  L1_BONUS_PCT: 0.05,
};

// ── Expected value helpers ────────────────────────────────────────────────────
export function expectedProfit(trading: number, rate = BC.PROFIT_RATE_MAX) {
  return trading * rate;
}

export function expectedFee(amount: number, recouped = false) {
  const pct = recouped ? BC.FEE_POST_RECOUP : BC.FEE_PRE_RECOUP;
  return Math.max(amount * pct, BC.MIN_FEE_USD);
}

export function expectedNet(amount: number, recouped = false) {
  return amount - expectedFee(amount, recouped);
}

export function expectedQuota(depositAmount: number, rank: string) {
  return depositAmount * (BC.QUOTA_MULTIPLIER[rank] ?? 1.0);
}

export function expectedLuckyPrize(trading: number, tier: 'small' | 'medium' | 'jackpot') {
  const pcts = { small: BC.LUCKY_SMALL_PCT, medium: BC.LUCKY_MEDIUM_PCT, jackpot: BC.LUCKY_JACKPOT_PCT };
  return trading * pcts[tier];
}

// ── API helpers ───────────────────────────────────────────────────────────────

// Maps email → env key pre-populated by global-setup to avoid rate limiting
const EMAIL_ENV_KEY: Record<string, string> = {
  'userb@test.com':  'TEST_TOKEN_USERB',
  'usera@test.com':  'TEST_TOKEN_USERA',
  'admin@test.com':  'TEST_TOKEN_ADMIN',
  'root@admin.com':  'TEST_TOKEN_ROOT',
};

export async function apiLogin(
  request: APIRequestContext,
  user: { email: string; password: string }
): Promise<string> {
  // Use pre-fetched token from global-setup to avoid rate limiting
  const envKey = EMAIL_ENV_KEY[user.email];
  const cached = envKey ? process.env[envKey] : undefined;
  if (cached) return cached;

  const res = await request.post(`${API_URL}/auth/login`, {
    data: { email: user.email, password: user.password },
  });
  expect(res.ok(), `Login failed for ${user.email}: ${res.status()}`).toBeTruthy();
  const body = await res.json();
  return body.access_token ?? body.accessToken;
}

export function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function getWallets(
  request: APIRequestContext,
  token: string
): Promise<Array<{ type: string; balance: string }> | null> {
  const res = await request.get(`${API_URL}/wallet`, { headers: authHeaders(token) });
  if (!res.ok()) return null; // rate-limited (429) or other transient error
  const body = await res.json();
  // BE returns { wallets: [...], depositAddress, ... }
  return (body.wallets ?? body) as Array<{ type: string; balance: string }>;
}

export function walletBalance(wallets: Array<{ type: string; balance: string }>, type: string): number {
  const w = wallets.find((w) => w.type === type);
  return w ? parseFloat(w.balance) : 0;
}

// ── Retry utilities ───────────────────────────────────────────────────────────

export const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Retries an API call when the BE returns 429 (rate limited).
 * Uses a flat delay between attempts so total wait = retryDelayMs × (maxRetries-1).
 * Default: 6 attempts × 15 s flat = up to 75 s wait, clears any ≤60 s rate-limit window.
 */
export async function withRetry<T extends { status(): number }>(
  fn: () => Promise<T>,
  maxRetries = 6,
  retryDelayMs = 15000
): Promise<T> {
  let res!: T;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    res = await fn();
    if (res.status() !== 429 || attempt === maxRetries) return res;
    console.log(`[withRetry] 429 — waiting ${retryDelayMs / 1000}s (attempt ${attempt}/${maxRetries})`);
    await delay(retryDelayMs);
  }
  return res;
}

/**
 * GET /wallet with automatic 429 retry. Throws on non-ok after retries.
 * Uses higher retry count + delay to handle aggressive rate limiters.
 */
export async function getWalletsRetry(
  request: APIRequestContext,
  token: string
): Promise<Array<{ type: string; balance: string }>> {
  const res = await withRetry(
    () => request.get(`${API_URL}/wallet`, { headers: authHeaders(token) })
  );
  if (!res.ok()) throw new Error(`getWalletsRetry: HTTP ${res.status()}`);
  const body = await res.json() as Record<string, unknown>;
  return (body['wallets'] ?? body) as Array<{ type: string; balance: string }>;
}

// ── UI auth helper ────────────────────────────────────────────────────────────

/**
 * Sets localStorage auth state via addInitScript so the page loads as authenticated.
 * Uses cached tokens from global-setup (env vars) to avoid 429 rate limiting.
 * Must be called BEFORE page.goto().
 */
export async function login(
  page: Page,
  user: { email: string; password: string } = USERS.userB
) {
  let finalToken: string | undefined;
  let userId: string | undefined;
  let walletAddress: string | undefined;
  let rank: string | undefined;

  // For userB use the legacy TEST_AUTH_TOKEN env var (includes userId/wallet/rank)
  if (user.email === USERS.userB.email && process.env['TEST_AUTH_TOKEN']) {
    finalToken = process.env['TEST_AUTH_TOKEN'];
    userId = process.env['TEST_AUTH_USER_ID'] ?? undefined;
    walletAddress = process.env['TEST_AUTH_WALLET'] ?? undefined;
    rank = process.env['TEST_AUTH_RANK'] ?? undefined;
  } else {
    // Use per-user cached token from global-setup for other seeder users
    const envKey = EMAIL_ENV_KEY[user.email];
    const cachedToken = envKey ? process.env[envKey] : undefined;

    if (cachedToken) {
      finalToken = cachedToken;
    } else {
      // Fall back to fresh API login with one 429 retry
      for (let attempt = 1; attempt <= 2; attempt++) {
        if (attempt > 1) await new Promise((r) => setTimeout(r, 4000));
        const res = await page.request.post(`${API_URL}/auth/login`, {
          data: { email: user.email, password: user.password },
        });
        if (res.status() === 429 && attempt < 2) continue;
        const body = await res.json();
        finalToken = body.access_token ?? body.accessToken;
        userId = body.user?.id;
        walletAddress = body.user?.walletAddress;
        rank = body.user?.rank;
        break;
      }
    }
  }

  if (!finalToken) throw new Error(`Could not obtain token for ${user.email}`);

  const macAuth = JSON.stringify({
    state: {
      accessToken: finalToken,
      user: { userId: userId ?? '', walletAddress: walletAddress ?? '', rank: rank ?? '', email: user.email },
      isAuthenticated: true,
    },
    version: 0,
  });

  await page.addInitScript(
    ({ macAuth, token }) => {
      localStorage.setItem('mac-auth', macAuth);
      localStorage.setItem('access_token', token);
    },
    { macAuth, token: finalToken }
  );
}

// ── Profile API mock ─────────────────────────────────────────────────────────

/**
 * Intercepts GET /auth/profile so AdminGuard sees role:'ADMIN'.
 * Must be called BEFORE page.goto().
 */
export async function mockAdminProfile(page: Page, email: string) {
  await page.route('**/auth/profile', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'mocked-admin-id',
        email,
        role: 'ADMIN',
        rank: 'ADMIN',
        walletAddress: '0x' + 'a'.repeat(40),
        isRaider: false,
        referrerId: null,
        referrerWalletAddress: null,
        totalDirectDownline: 0,
        activeDirectDownline: 0,
        qualifiedDirectDownline: 0,
        directMembershipCount: 0,
        directLeaderCount: 0,
        directGoldLeaderCount: 0,
        directDiamondLeaderCount: 0,
      }),
    });
  });
}

// ── Wallet API mock ───────────────────────────────────────────────────────────

/**
 * Intercepts the wallet API response with deterministic mock data.
 * Use in UI tests to avoid rate limiting on GET /wallet and ensure
 * all wallet action buttons (Deposit, Submit Tx, Send, Withdraw) are rendered.
 * Must be called BEFORE page.goto().
 */
export async function mockWalletApi(page: Page) {
  // Mock GET /wallet (balance endpoint)
  await page.route('http://localhost:3000/wallet', async (route, request) => {
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          depositAddress: '0x' + 'abcdef1234'.repeat(4),
          depositNetworks: ['BEP20'],
          wallets: [
            { type: 'USDT',              balance: '50.0000' },
            { type: 'TRADING',           balance: '100.0000' },
            { type: 'PROFIT',            balance: '5.0000', profitQuota: '300.0000' },
            { type: 'PROFIT_INVESTMENT', balance: '2.5000' },
          ],
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock GET /wallet/transactions (prevents 401 from triggering logout+redirect)
  await page.route(/localhost:3000\/wallet\/transactions/, async (route, request) => {
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ total: 0, limit: 10, offset: 0, data: [] }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock GET /wallet/profit-summary and /wallet/withdrawal-fee-info (silent fallback)
  await page.route(/localhost:3000\/wallet\/(profit-summary|withdrawal-fee-info)/, async (route, request) => {
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    } else {
      await route.continue();
    }
  });
}
