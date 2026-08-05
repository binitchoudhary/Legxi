import { create } from 'zustand';

export type AuthStatus = 'UNKNOWN' | 'LOADING' | 'AUTHENTICATED' | 'GUEST' | 'EXPIRED';

export type UserRole = 'GUEST' | 'BIDDER' | 'MANAGER' | 'ADMIN';

export interface UserPayload {
  id: string;
  email: string;
  roles: UserRole[];
  exp?: number;
}

interface AuthState {
  status: AuthStatus;
  user: UserPayload | null;
  setAuth: (user: UserPayload) => void;
  setGuest: () => void;
  setLoading: () => void;
  setExpired: () => void;
  logout: () => void;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'UNKNOWN',
  user: null,
  setAuth: (user) => set({ status: 'AUTHENTICATED', user }),
  setGuest: () => set({ status: 'GUEST', user: null }),
  setLoading: () => set({ status: 'LOADING' }),
  setExpired: () => set({ status: 'EXPIRED', user: null }),
  logout: () => {
    fetch('/api/auth/logout', { method: 'POST' }).catch(console.error);
    set({ status: 'GUEST', user: null });
  },
  initAuth: async () => {
    set({ status: 'LOADING' });
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        set({ status: 'AUTHENTICATED', user: data });
      } else {
        set({ status: 'GUEST', user: null });
      }
    } catch {
      set({ status: 'GUEST', user: null });
    }
  }
}));
