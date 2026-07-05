import { api } from './axios';
import { memoTTL } from './memoTTL';
import { normalizeEmail } from './email';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  UserProfile,
} from '@/types/auth.types';

// Backend response shapes (differ from FE contract)
interface BE_LoginResponse {
  accessToken: string;
  // role is not yet returned by the BE but will be added in a future update
  user: { id: string; email: string; walletAddress: string; rank: string; role?: 'USER' | 'ADMIN' };
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const payload = { ...data, email: normalizeEmail(data.email) };
  const res = await api.post<BE_LoginResponse>('/auth/login', payload);
  return {
    access_token: res.accessToken,
    id: res.user.id,
    wallet_address: res.user.walletAddress,
    rank: res.user.rank,
    role: res.user.role,
  };
}

// adminLogin uses the same /auth/login endpoint — role is verified via getProfile()
export const adminLogin = login;

export async function sendOtp(email: string): Promise<void> {
  await api.post('/auth/send-otp', { email: normalizeEmail(email) });
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post('/auth/forgot-password', { email: normalizeEmail(email) });
}

export async function resetPassword(data: ResetPasswordRequest): Promise<void> {
  await api.post('/auth/reset-password', { ...data, email: normalizeEmail(data.email) });
}

export function getProfile(): Promise<UserProfile> {
  return api.get<UserProfile>('/auth/profile');
}

// ── Network Tree ─────────────────────────────────────────────────────────────

export interface NetworkNode {
  id: string;
  email: string;
  walletAddress: string;
  rank: string;
  isRaider: boolean;
  depth: number;
  tradingBalance: string;
  createdAt: string;
  children: NetworkNode[];
}

export interface NetworkTreeResponse {
  totalMembers: number;
  maxDepth: number;
  totalTurnover: string;
  ranksCount: {
    MEMBERSHIP: number;
    LEADER: number;
    GOLD_LEADER: number;
    DIAMOND_LEADER: number;
  };
  tree: NetworkNode[];
}

export function getNetworkTree(signal?: AbortSignal): Promise<NetworkTreeResponse> {
  return api.get<NetworkTreeResponse>('/auth/network-tree', { signal });
}

// Shared 30s cache for dashboard cards that all want the same tree data
// (NetworkStatusCard, NetworkRankSection, ReferralCard). Without this each
// card would fire its own /auth/network-tree request on mount.
export const getNetworkTreeCached = memoTTL(() => getNetworkTree(), 30_000);

export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  const email = normalizeEmail(data.email);
  // Referral address is mandatory — caller (RegisterModal) validates non-empty
  // before reaching here. No client-side fallback to a seeded admin wallet.
  await api.post('/auth/register', {
    email,
    password: data.password,
    referrer: data.referral_address?.trim(),
    otpCode: data.otpCode,
  });
  // BE register returns no tokens — auto-login with the same normalized email
  return login({ email, password: data.password });
}
