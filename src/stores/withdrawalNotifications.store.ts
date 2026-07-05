/**
 * In-flight withdrawal notification store.
 *
 * Manages floating mac-style notifications for the user's PROCESSING withdrawals.
 * The store keeps an ordered list of in-flight withdrawals and runs a single
 * shared poll (every POLL_INTERVAL_MS) when there's at least one PROCESSING
 * entry. Once all entries resolve (COMPLETED or FAILED), the poll stops.
 *
 * Source of truth = backend `/wallet/withdrawals` endpoint. The store is
 * reconstructible at any time (refresh, login) by calling `bootstrap()`.
 */
import { create } from 'zustand';
import { getMyWithdrawals, type WithdrawalEntry } from '@/lib/wallet';

// Poll cadence is conservative on purpose — BE throttles at 5 req/min/IP. With
// the previous 5s value, a single in-flight withdrawal already burned 12 of
// those budget slots, so any other page mount could push the user past the
// limit. 15s × auto-pause-when-hidden gives ≤4 req/min, leaves headroom for
// the rest of the app without hurting perceived freshness — the floating
// card animates while pending, so 15s feels live enough.
const POLL_INTERVAL_MS = 15_000;
const RESOLVED_AUTO_DISMISS_MS = 8_000; // auto-dismiss success/failure card after this
const NOTIFICATION_LIMIT = 10; // ceiling on concurrent notifications shown

export type NotificationItem = WithdrawalEntry;

interface State {
  notifications: NotificationItem[];
  isPolling: boolean;
}

interface Actions {
  /**
   * Add (or replace) a notification entry. Used:
   *  - by WithdrawModal after submit/timeout to spawn an in-flight notif
   *  - by `bootstrap()` to seed PROCESSING entries on app load
   *  - by the poller to update existing entries with fresher status
   */
  upsert: (entry: NotificationItem) => void;
  /** Drop a single notification (e.g. user clicks dismiss). */
  dismiss: (id: string) => void;
  /** Drop all notifications — typically on logout. */
  clear: () => void;
  /**
   * Fetch all PROCESSING withdrawals from the backend and seed the store.
   * Idempotent — dedupes by ID.
   */
  bootstrap: () => Promise<void>;
  /** Start the shared poller (no-op if already running). */
  startPolling: () => void;
  /** Stop the shared poller. */
  stopPolling: () => void;
}

let pollIntervalId: ReturnType<typeof setInterval> | null = null;
let visibilityListenerAttached = false;
const autoDismissTimers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleAutoDismiss(id: string, dismiss: (id: string) => void) {
  // If an earlier timer exists, clear it first (e.g. status flipped from
  // FAILED → COMPLETED, though that shouldn't normally happen).
  const prev = autoDismissTimers.get(id);
  if (prev) clearTimeout(prev);
  autoDismissTimers.set(
    id,
    setTimeout(() => {
      autoDismissTimers.delete(id);
      dismiss(id);
    }, RESOLVED_AUTO_DISMISS_MS),
  );
}

export const useWithdrawalNotificationStore = create<State & Actions>(
  (set, get) => ({
    notifications: [],
    isPolling: false,

    upsert: (entry) => {
      const existing = get().notifications.find((n) => n.id === entry.id);
      const wasInFlight = !existing || existing.status === 'PROCESSING' || existing.status === 'PENDING';
      const isResolved = entry.status === 'COMPLETED' || entry.status === 'FAILED';

      set((state) => {
        const next = state.notifications.filter((n) => n.id !== entry.id);
        next.unshift(entry); // newest first (top of stack)
        return { notifications: next.slice(0, NOTIFICATION_LIMIT) };
      });

      // Schedule auto-dismiss when an in-flight notification just resolved.
      if (wasInFlight && isResolved) {
        scheduleAutoDismiss(entry.id, get().dismiss);
      }

      // Auto-stop polling when nothing in-flight remains.
      const hasInFlight = get().notifications.some(
        (n) => n.status === 'PROCESSING' || n.status === 'PENDING',
      );
      if (!hasInFlight) get().stopPolling();
      else get().startPolling();
    },

    dismiss: (id) => {
      const t = autoDismissTimers.get(id);
      if (t) {
        clearTimeout(t);
        autoDismissTimers.delete(id);
      }
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
      const hasInFlight = get().notifications.some(
        (n) => n.status === 'PROCESSING' || n.status === 'PENDING',
      );
      if (!hasInFlight) get().stopPolling();
    },

    clear: () => {
      autoDismissTimers.forEach(clearTimeout);
      autoDismissTimers.clear();
      get().stopPolling();
      set({ notifications: [] });
    },

    bootstrap: async () => {
      try {
        const inFlight = await getMyWithdrawals({ status: 'PROCESSING', limit: 10 });
        for (const w of inFlight) get().upsert(w);
      } catch {
        // Silent fail — user just won't see notifications until next poll/refresh
      }
    },

    startPolling: () => {
      if (pollIntervalId) return;
      set({ isPolling: true });

      // Skip the request when the tab is in background — saves the 429 budget
      // for the visible tab. Status will catch up on the next tick after the
      // user comes back. Resume immediately on visibilitychange so the user
      // doesn't wait a full POLL_INTERVAL_MS for fresh data.
      const tick = async () => {
        if (typeof document !== 'undefined' && document.hidden) return;

        const inFlightIds = get()
          .notifications.filter(
            (n) => n.status === 'PROCESSING' || n.status === 'PENDING',
          )
          .map((n) => n.id);
        if (inFlightIds.length === 0) {
          get().stopPolling();
          return;
        }

        try {
          // Fetch latest 20 withdrawals — covers in-flight ones since they're newest.
          const recent = await getMyWithdrawals({ limit: 20 });
          for (const w of recent) {
            if (inFlightIds.includes(w.id)) get().upsert(w);
          }
        } catch {
          // Silent — retry next tick
        }
      };

      pollIntervalId = setInterval(tick, POLL_INTERVAL_MS);

      // One-shot tick on focus return so the user sees fresh status without
      // waiting for the next interval.
      if (!visibilityListenerAttached && typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden && pollIntervalId) tick();
        });
        visibilityListenerAttached = true;
      }
    },

    stopPolling: () => {
      if (pollIntervalId) {
        clearInterval(pollIntervalId);
        pollIntervalId = null;
      }
      set({ isPolling: false });
    },
  }),
);
