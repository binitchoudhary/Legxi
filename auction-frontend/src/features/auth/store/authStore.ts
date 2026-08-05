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
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'UNKNOWN',
  user: null,
  setAuth: (user) => set({ status: 'AUTHENTICATED', user }),
  setGuest: () => set({ status: 'GUEST', user: null }),
  setLoading: () => set({ status: 'LOADING' }),
  setExpired: () => set({ status: 'EXPIRED', user: null }),
  logout: () => set({ status: 'GUEST', user: null }),
}));
