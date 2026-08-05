import { create } from 'zustand';

export type AuthStatus = 'INITIALIZING' | 'AUTHENTICATED' | 'UNAUTHENTICATED' | 'SESSION_EXPIRED';

export type UserRole = 'GUEST' | 'BIDDER' | 'MANAGER' | 'ADMIN';

export interface UserPayload {
  id: string;
  email: string;
  roles: UserRole[];
  name?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  status: AuthStatus;
  user: UserPayload | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  initializeSession: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'INITIALIZING',
  user: null,
  isLoading: false,
  isRefreshing: false,
  error: null,

  initializeSession: async () => {
    set({ status: 'INITIALIZING', isLoading: true, error: null });
    try {
      const sessionRes = await fetch('/api/auth/session');
      if (sessionRes.ok) {
        const data = await sessionRes.json();
        set({ status: 'AUTHENTICATED', user: data, isLoading: false, error: null });
        return;
      }

      // If access token expired, attempt fallback refresh before deciding unauthenticated
      if (sessionRes.status === 401) {
        const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' });
        if (refreshRes.ok) {
          const retrySessionRes = await fetch('/api/auth/session');
          if (retrySessionRes.ok) {
            const retryData = await retrySessionRes.json();
            set({ status: 'AUTHENTICATED', user: retryData, isLoading: false, error: null });
            return;
          }
        }
      }

      set({ status: 'UNAUTHENTICATED', user: null, isLoading: false, error: null });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Session initialization failed';
      set({ status: 'UNAUTHENTICATED', user: null, isLoading: false, error: errorMsg });
    }
  },

  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        set({
          status: 'AUTHENTICATED',
          user: {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            roles: data.user.roles || [data.role || 'BIDDER'],
            createdAt: data.user.createdAt,
            updatedAt: data.user.updatedAt,
          },
          isLoading: false,
          error: null,
        });
        return true;
      } else {
        const errorMsg = data?.error?.message || 'Invalid credentials';
        set({ status: 'UNAUTHENTICATED', user: null, isLoading: false, error: errorMsg });
        return false;
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Authentication failed';
      set({ status: 'UNAUTHENTICATED', user: null, isLoading: false, error: errorMsg });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Suppress network errors on logout to guarantee clean client-side reset
    } finally {
      set({ status: 'UNAUTHENTICATED', user: null, isLoading: false, error: null });
    }
  },

  refreshSession: async () => {
    set({ isRefreshing: true });
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      if (res.ok) {
        const sessionRes = await fetch('/api/auth/session');
        if (sessionRes.ok) {
          const data = await sessionRes.json();
          set({ status: 'AUTHENTICATED', user: data, isRefreshing: false, error: null });
          return true;
        }
      }
      set({ status: 'SESSION_EXPIRED', user: null, isRefreshing: false });
      return false;
    } catch {
      set({ status: 'SESSION_EXPIRED', user: null, isRefreshing: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
