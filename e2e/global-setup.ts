import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const API_URL = 'http://localhost:3000';
const CACHE_FILE = path.resolve(process.cwd(), 'e2e', '.auth-cache.json');
const CACHE_TTL_MS = 50 * 60 * 1000;

interface UserCreds { email: string; password: string; envKey: string }

const ALL_USERS: UserCreds[] = [
  { email: 'userb@test.com',   password: 'Test@123',    envKey: 'USERB' },
  { email: 'usera@test.com',   password: 'Test@123',    envKey: 'USERA' },
  { email: 'admin@test.com',   password: 'Test@123',    envKey: 'ADMIN' },
  { email: 'root@admin.com',   password: 'Root@123456', envKey: 'ROOT'  },
];

// Legacy single-user cache (kept for backward compat with helpers.ts login())
const DEFAULT_USER = { email: 'userb@test.com', password: 'Test@123' };

interface SingleCache {
  accessToken: string;
  userId: string;
  walletAddress: string;
  rank: string;
  cachedAt: number;
  // Per-user tokens added in v2
  tokens?: Record<string, string>;
}

function loadCache(): SingleCache | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')) as SingleCache;
    if (Date.now() - cache.cachedAt < CACHE_TTL_MS) return cache;
    return null;
  } catch {
    return null;
  }
}

function saveCache(data: Omit<SingleCache, 'cachedAt'>) {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify({ ...data, cachedAt: Date.now() }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loginUser(page: any, creds: UserCreds): Promise<string | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await page.request.post(`${API_URL}/auth/login`, {
      data: { email: creds.email, password: creds.password },
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok()) {
      const body = await res.json();
      return body.accessToken ?? body.access_token ?? null;
    }

    if (res.status() === 429 && attempt < 3) {
      const wait = attempt * 4000;
      console.log(`⚠ Rate limited (429) for ${creds.email}. Retrying in ${wait / 1000}s… (${attempt}/3)`);
      await new Promise((r) => setTimeout(r, wait));
    } else if (res.status() === 429) {
      console.warn(`⚠ Could not login ${creds.email} after retries — continuing without token`);
      return null;
    } else {
      const body = await res.text();
      throw new Error(`globalSetup: login failed for ${creds.email} (${res.status()}): ${body}`);
    }
  }
  return null;
}

export default async function globalSetup() {
  const cached = loadCache();

  // If cache is fresh AND has all user tokens, reuse it
  if (cached?.tokens && Object.keys(cached.tokens).length >= ALL_USERS.length) {
    process.env['TEST_AUTH_TOKEN'] = cached.accessToken;
    process.env['TEST_AUTH_USER_ID'] = cached.userId;
    process.env['TEST_AUTH_WALLET'] = cached.walletAddress;
    process.env['TEST_AUTH_RANK'] = cached.rank;
    for (const u of ALL_USERS) {
      const t = cached.tokens[u.envKey];
      if (t) process.env[`TEST_TOKEN_${u.envKey}`] = t;
    }
    console.log('✓ Auth tokens loaded from cache');
    return;
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Login all users sequentially with a small delay to avoid rate limiting
  const tokens: Record<string, string> = {};
  let defaultToken = '';
  let userId = '';
  let walletAddress = '';
  let rank = '';

  for (const u of ALL_USERS) {
    if (u.envKey !== 'USERB') {
      // Small delay between logins to stay under rate limit
      await new Promise((r) => setTimeout(r, 1500));
    }

    const token = await loginUser(page, u);
    if (token) {
      tokens[u.envKey] = token;
      process.env[`TEST_TOKEN_${u.envKey}`] = token;
      console.log(`✓ Token fetched for ${u.email}`);

      // For the default user (userB), also fetch profile details
      if (u.envKey === 'USERB') {
        defaultToken = token;
        // Fetch profile to get userId, walletAddress, rank
        const profileRes = await page.request.get(`${API_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (profileRes.ok()) {
          const profile = await profileRes.json();
          userId = profile.id ?? '';
          walletAddress = profile.walletAddress ?? '';
          rank = profile.rank ?? '';
        }
      }
    } else {
      console.warn(`⚠ Skipped token for ${u.email}`);
    }
  }

  await browser.close();

  if (!defaultToken) {
    throw new Error(
      `globalSetup: login failed for ${DEFAULT_USER.email}.\n` +
      `Make sure the BE seeder has been run: npx tsx prisma/seed-test-profit.ts`
    );
  }

  process.env['TEST_AUTH_TOKEN'] = defaultToken;
  process.env['TEST_AUTH_USER_ID'] = userId;
  process.env['TEST_AUTH_WALLET'] = walletAddress;
  process.env['TEST_AUTH_RANK'] = rank;

  saveCache({ accessToken: defaultToken, userId, walletAddress, rank, tokens });
  console.log('✓ All auth tokens fetched and cached');
}
