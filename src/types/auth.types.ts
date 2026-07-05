export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  /** User ID */
  id: string;
  /** The user's wallet address — can be shared as a referral code */
  wallet_address: string;
  rank: string;
  /** Returned by BE when role is included in login response (future) */
  role?: 'USER' | 'ADMIN';
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirm_password: string;
  referral_address?: string;
  otpCode: string;
}

export interface RegisterResponse {
  access_token: string;
  id: string;
  wallet_address: string;
  rank: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otpCode: string;
  newPassword: string;
}

export interface UserProfile {
  id: string;
  email: string;
  walletAddress: string;
  role: 'USER' | 'ADMIN';
  rank: string;
  isRaider: boolean;
  /** False if user's trading wallet < $30 (rank requirements not met) */
  isQualified?: boolean;
  referrerId: string | null;
  referrerWalletAddress: string | null;
  totalDirectDownline: number;
  // Direct-downline rank counts and active-trading total are derived FE-side
  // from `/auth/network-tree` (see `useDirectNetworkStats`), not sent by BE.
  createdAt: string;
}
