/**
 * Persists the user's pending USDT-withdrawal intent across modal closes / tab switches
 * within a single browser session.
 *
 * Stored in sessionStorage (NOT localStorage) so that closing the browser invalidates
 * the intent — that's a security boundary worth preserving for an OTP-gated action.
 *
 * The OTP code itself is NEVER stored. Only the intent (amount + destination + when the
 * code was last requested) is persisted; the user re-types the code from their email.
 */

const STORAGE_KEY = 'withdraw-intent';

/** BE OTP TTL — must match `OTP_EXPIRY_MS` in mac-backend auth.service.ts (10 min). */
export const OTP_TTL_MS = 10 * 60 * 1000;
/** BE resend cooldown — must match `OTP_COOLDOWN_SECONDS` (60s). */
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

export interface WithdrawIntent {
  /** Scope to the current authenticated user — guards against tab-switching to a different account. */
  userId: string;
  amount: string;
  withdrawalAddress: string;
  /** Unix ms when the OTP was last requested (or resent). Used to compute both expiry and cooldown. */
  otpRequestedAt: number;
}

export function saveWithdrawIntent(intent: WithdrawIntent): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
  } catch {
    // sessionStorage may be unavailable (private mode, quota); silently ignore.
  }
}

export function loadWithdrawIntent(userId: string): WithdrawIntent | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as WithdrawIntent;
    if (data.userId !== userId) return null;
    if (Date.now() - data.otpRequestedAt >= OTP_TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearWithdrawIntent(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Seconds until OTP expires (0 if expired). */
export function otpRemainingSec(intent: WithdrawIntent): number {
  return Math.max(0, Math.ceil((intent.otpRequestedAt + OTP_TTL_MS - Date.now()) / 1000));
}

/** Seconds until resend cooldown ends (0 if can resend now). */
export function resendCooldownSec(intent: WithdrawIntent): number {
  return Math.max(0, Math.ceil((intent.otpRequestedAt + OTP_RESEND_COOLDOWN_MS - Date.now()) / 1000));
}

/** Format seconds → "Xm Ys" or "Xs" — used in the expiry countdown UI. */
export function formatRemaining(totalSec: number): string {
  if (totalSec <= 0) return '0s';
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}
