import { api } from './axios';

// ── Response shapes ──────────────────────────────────────────────────────────

export interface PresaleStats {
  tokenName: string;
  price: string;
  presaleAllocation: string;
  totalSupply: string;
  totalSold: string;
  remaining: string;
  totalRaised: string;
  isActive: boolean;
}

export interface TokenPurchaseEntry {
  id: string;
  tokenAmount: string;
  usdtAmount: string;
  priceAtTime: string;
  createdAt: string;
}

export interface MyPurchasesResponse {
  totalTokens: string;
  totalSpent: string;
  purchases: TokenPurchaseEntry[];
}

// ── API calls ────────────────────────────────────────────────────────────────

export function getPresaleStats(): Promise<PresaleStats> {
  return api.get<PresaleStats>('/presale/stats');
}

export function buyTokens(
  tokenAmount: string,
): Promise<{ message: string }> {
  return api.post<{ message: string }>('/presale/buy', { tokenAmount });
}

export function getMyPurchases(): Promise<MyPurchasesResponse> {
  return api.get<MyPurchasesResponse>('/presale/my-purchases');
}

export interface PresaleEligibility {
  eligible: boolean;
  requiredTokens: number;
  totalSpent: string;
  totalTokens: number;
  remainingTokens: number;
}

export function getPresaleEligibility(): Promise<PresaleEligibility> {
  return api.get<PresaleEligibility>('/presale/eligibility');
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface PresaleAdminConfig {
  tokenName?: string;
  priceUsd?: number;
  presaleAllocation?: number;
  totalSupply?: number;
  isActive?: boolean;
}

export function updatePresaleConfig(config: PresaleAdminConfig): Promise<void> {
  return api.patch<void>('/presale/admin/config', config);
}
