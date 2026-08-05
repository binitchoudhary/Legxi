import { useAuthStore } from '../store/authStore';

describe('AuthStore Unit Tests', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      status: 'INITIALIZING',
      user: null,
      isLoading: false,
      isRefreshing: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  describe('initializeSession', () => {
    it('hydrates user on successful session lookup', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'usr_1',
          email: 'admin@legxi.com',
          roles: ['ADMIN'],
        }),
      } as Response);

      await useAuthStore.getState().initializeSession();

      const state = useAuthStore.getState();
      expect(state.status).toBe('AUTHENTICATED');
      expect(state.user).toEqual({
        id: 'usr_1',
        email: 'admin@legxi.com',
        roles: ['ADMIN'],
      });
      expect(state.isLoading).toBe(false);
    });

    it('attempts refresh on 401 and succeeds if refresh succeeds', async () => {
      // 1. Initial /session returns 401
      // 2. /refresh returns 200
      // 3. retry /session returns 200
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ success: false }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            id: 'usr_refreshed',
            email: 'user@legxi.com',
            roles: ['BIDDER'],
          }),
        } as Response);

      await useAuthStore.getState().initializeSession();

      const state = useAuthStore.getState();
      expect(state.status).toBe('AUTHENTICATED');
      expect(state.user?.id).toBe('usr_refreshed');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('sets UNAUTHENTICATED when /session returns 401 and refresh fails', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ success: false }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ success: false }),
        } as Response);

      await useAuthStore.getState().initializeSession();

      const state = useAuthStore.getState();
      expect(state.status).toBe('UNAUTHENTICATED');
      expect(state.user).toBeNull();
    });
  });

  describe('login', () => {
    it('sets AUTHENTICATED on successful login', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: {
            id: 'usr_admin',
            email: 'admin@legxi.com',
            name: 'System Admin',
            roles: ['ADMIN'],
          },
        }),
      } as Response);

      const success = await useAuthStore.getState().login({
        email: 'admin@legxi.com',
        password: 'Password123!',
      });

      expect(success).toBe(true);
      const state = useAuthStore.getState();
      expect(state.status).toBe('AUTHENTICATED');
      expect(state.user?.email).toBe('admin@legxi.com');
      expect(state.error).toBeNull();
    });

    it('sets error message on invalid credentials', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        }),
      } as Response);

      const success = await useAuthStore.getState().login({
        email: 'admin@legxi.com',
        password: 'WrongPassword',
      });

      expect(success).toBe(false);
      const state = useAuthStore.getState();
      expect(state.status).toBe('UNAUTHENTICATED');
      expect(state.user).toBeNull();
      expect(state.error).toBe('Invalid email or password');
    });
  });

  describe('logout', () => {
    it('resets state to UNAUTHENTICATED and user to null', async () => {
      useAuthStore.setState({
        status: 'AUTHENTICATED',
        user: { id: 'usr_1', email: 'test@legxi.com', roles: ['BIDDER'] },
      });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.status).toBe('UNAUTHENTICATED');
      expect(state.user).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });
    });
  });

  describe('refreshSession', () => {
    it('re-hydrates session if refresh succeeds', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            id: 'usr_1',
            email: 'admin@legxi.com',
            roles: ['ADMIN'],
          }),
        } as Response);

      const success = await useAuthStore.getState().refreshSession();

      expect(success).toBe(true);
      const state = useAuthStore.getState();
      expect(state.status).toBe('AUTHENTICATED');
      expect(state.isRefreshing).toBe(false);
    });

    it('sets SESSION_EXPIRED if refresh fails', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ success: false }),
      } as Response);

      const success = await useAuthStore.getState().refreshSession();

      expect(success).toBe(false);
      const state = useAuthStore.getState();
      expect(state.status).toBe('SESSION_EXPIRED');
      expect(state.user).toBeNull();
      expect(state.isRefreshing).toBe(false);
    });
  });
});
