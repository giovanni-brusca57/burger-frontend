import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

// ---------------------------------------------------------------------------
// Instance
// ---------------------------------------------------------------------------

const axiosInstance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ---------------------------------------------------------------------------
// Request interceptor — attach auth token
// ---------------------------------------------------------------------------

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------------------------------------------------------------------
// Response interceptor — normalise errors
// ---------------------------------------------------------------------------

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 401) {
        // Token expired — clear both the Zustand store and show login modal.
        // Lazy imports avoid circular deps; safe because stores are already initialised.
        import('@/stores/auth.store').then(({ useAuthStore }) => {
          useAuthStore.getState().logout();
        });
        import('@/stores/auth-modal.store').then(({ useAuthModalStore }) => {
          // Don't override an in-progress register modal (e.g. a referral
          // landing that's mid-flight via `?ref=`). Only switch to login if
          // we're not already showing register or forgot-password.
          const { mode, showLogin } = useAuthModalStore.getState();
          if (mode !== 'register' && mode !== 'forgot-password') {
            showLogin();
          }
        });
      }

      // Bubble up a consistent error shape
      return Promise.reject({
        status,
        message:
          error.response?.data?.message ??
          error.message ??
          'An unexpected error occurred.',
        data: error.response?.data ?? null,
      });
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

// ---------------------------------------------------------------------------
// API helper — typed wrappers for all HTTP verbs
// ---------------------------------------------------------------------------

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  status?: number;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// In-flight GET coalescing
// ---------------------------------------------------------------------------
// Multiple components/effects often hit the same endpoint at the same instant
// (page mount + modal open + store hydration). Without coalescing, each one
// fires its own network call and chews through the BE's 5 req/min throttler.
// We key by `method:url:querystring` so identical concurrent GETs share a
// single Promise; the cache entry is removed as soon as the request settles
// (success OR failure), so this is *only* an in-flight dedupe — it never
// serves stale data on the next call.
//
// Mutations (POST/PUT/PATCH/DELETE) deliberately bypass coalescing since they
// have side-effects and must each hit the server.

const inFlightGets = new Map<string, Promise<unknown>>();

function buildGetKey(url: string, params?: Record<string, unknown>): string {
  if (!params) return `GET:${url}`;
  // Sort keys so { a: 1, b: 2 } and { b: 2, a: 1 } match.
  const sortedQs = Object.keys(params)
    .sort()
    .map((k) => `${k}=${String(params[k])}`)
    .join('&');
  return `GET:${url}?${sortedQs}`;
}

function coalescedGet<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  // Skip coalescing when caller passed an AbortSignal — they expect their own
  // promise that they can cancel without affecting other callers.
  if (config?.signal) {
    return axiosInstance.get<T>(url, config).then((r) => r.data);
  }

  const key = buildGetKey(url, config?.params as Record<string, unknown> | undefined);
  const existing = inFlightGets.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = axiosInstance
    .get<T>(url, config)
    .then((r) => r.data)
    .finally(() => {
      // Remove on settle (success or fail) — next call hits the network again.
      if (inFlightGets.get(key) === promise) inFlightGets.delete(key);
    });

  inFlightGets.set(key, promise);
  return promise;
}

/**
 * Typed API service wrapping the axios instance.
 *
 * Usage:
 * ```ts
 * import { api } from '@/lib/axios';
 *
 * const users = await api.get<User[]>('/users');
 * const user  = await api.getById<User>('/users', 42);
 * await api.post<User>('/users', { name: 'Alice' });
 * await api.put<User>('/users/42', updatedUser);
 * await api.patch<User>('/users/42', { name: 'Bob' });
 * await api.delete('/users', 42);
 * ```
 *
 * GET calls are deduped while in-flight: identical concurrent requests share
 * one Promise. POST/PUT/PATCH/DELETE always hit the network.
 */
export const api = {
  /** GET list — query params can be passed via `config.params`. In-flight dedupe. */
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return coalescedGet<T>(url, config);
  },

  /** GET single record by id — appends `/:id` to the url. In-flight dedupe. */
  getById<T = unknown>(
    url: string,
    id: string | number,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return coalescedGet<T>(`${url}/${id}`, config);
  },

  /** POST — create a new resource */
  post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return axiosInstance.post<T>(url, data, config).then((r) => r.data);
  },

  /** PUT — full replacement of a resource */
  put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return axiosInstance.put<T>(url, data, config).then((r) => r.data);
  },

  /** PATCH — partial update of a resource */
  patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return axiosInstance.patch<T>(url, data, config).then((r) => r.data);
  },

  /** DELETE by id — appends `/:id` to the url */
  delete<T = unknown>(
    url: string,
    id?: string | number,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const endpoint = id !== undefined ? `${url}/${id}` : url;
    return axiosInstance.delete<T>(endpoint, config).then((r) => r.data);
  },
};
