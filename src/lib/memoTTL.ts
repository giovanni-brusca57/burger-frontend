/**
 * Wrap a zero-argument fetcher so identical calls within `ttlMs` return the
 * same Promise — second-tier dedupe on top of the in-flight coalescing in
 * `axios.ts`. Used for direct API calls that aren't behind a Zustand store
 * (jackpot, mev wallet, admin summary, etc.) — these would otherwise re-fire
 * on every page mount and burn through the BE's 5 req/min budget.
 *
 * Behaviour:
 *  - Fresh call within TTL → returns the cached Promise (no network round-trip)
 *  - Failed Promise self-clears so a transient error doesn't poison the cache
 *  - `.invalidate()` lets mutation handlers force a fresh fetch on next call
 *  - `.peek()` returns the current cached value if present (read-only)
 *  - All instances auto-register so `invalidateAllCaches()` (called from
 *    auth.store logout) can wipe every cache in one shot — prevents the
 *    "shared kiosk" leak where user A's data flashes to user B.
 */
export interface MemoTTL<T> {
  (): Promise<T>;
  /** Drop the cache so the next call hits the network. */
  invalidate: () => void;
  /** Return the cached Promise if any (does not trigger a fetch). */
  peek: () => Promise<T> | null;
}

// Module-scoped registry. WeakSet would be ideal, but cache wrappers are
// long-lived (module-level singletons) so a regular Set is fine and gives us
// `forEach` for the bulk-invalidate pass.
const allCaches = new Set<MemoTTL<unknown>>();

export function memoTTL<T>(fn: () => Promise<T>, ttlMs = 30_000): MemoTTL<T> {
  let cached: { value: Promise<T>; ts: number } | null = null;

  const wrapped = (() => {
    const now = Date.now();
    if (cached && now - cached.ts < ttlMs) return cached.value;

    const value = fn();
    const entry = { value, ts: now };
    cached = entry;

    // If the request fails, drop this entry so next caller retries.
    value.catch(() => {
      if (cached === entry) cached = null;
    });

    return value;
  }) as MemoTTL<T>;

  wrapped.invalidate = () => {
    cached = null;
  };
  wrapped.peek = () => cached?.value ?? null;

  allCaches.add(wrapped as MemoTTL<unknown>);
  return wrapped;
}

/**
 * Invalidate every memoTTL cache created so far. Call on logout, account
 * switch, or anywhere "the user identity changed and stale data is unsafe".
 * Safe to call multiple times — invalidating an already-empty cache is a no-op.
 */
export function invalidateAllCaches(): void {
  allCaches.forEach((c) => c.invalidate());
}
