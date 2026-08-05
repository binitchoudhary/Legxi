import { AXIOS_INSTANCE, normalizeError } from '@/api/client/axios';
import { useAuthStore } from '@/features/auth/store/authStore';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

describe('Centralized API Client Interceptor Integration Tests', () => {
  let originalAdapter: unknown;

  beforeEach(() => {
    originalAdapter = AXIOS_INSTANCE.defaults.adapter;
    useAuthStore.setState({
      status: 'AUTHENTICATED',
      user: { id: 'usr_1', email: 'test@legxi.com', roles: ['BIDDER'] },
      isLoading: false,
      isRefreshing: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    AXIOS_INSTANCE.defaults.adapter = originalAdapter as any;
  });

  it('injects x-correlation-id and x-request-id on outbound requests', async () => {
    let capturedConfig: InternalAxiosRequestConfig | undefined;

    AXIOS_INSTANCE.defaults.adapter = async (config) => {
      capturedConfig = config;
      return {
        data: { success: true, data: 'ok' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    const res = await AXIOS_INSTANCE.get('/test-endpoint');
    expect(res.status).toBe(200);
    expect(capturedConfig?.headers['x-correlation-id']).toBeDefined();
    expect(capturedConfig?.headers['x-request-id']).toBeDefined();
  });

  it('automatically triggers refreshSession on 401 and retries original request once', async () => {
    const refreshSpy = jest.spyOn(useAuthStore.getState(), 'refreshSession').mockResolvedValueOnce(true);

    let callCount = 0;
    AXIOS_INSTANCE.defaults.adapter = async (config) => {
      callCount++;
      if (callCount === 1) {
        const error = new Error('Request failed with status code 401') as AxiosError;
        error.config = config;
        error.response = {
          data: { error: { code: 'UNAUTHORIZED', message: 'Token expired' } },
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config,
        };
        throw error;
      }
      return {
        data: { success: true, data: 'secret payload' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    const res = await AXIOS_INSTANCE.get('/protected-data');

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ success: true, data: 'secret payload' });
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(callCount).toBe(2);
  });

  it('queues concurrent 401 requests and replays all upon single successful refresh', async () => {
    let refreshResolve: (val: boolean) => void;
    const refreshPromise = new Promise<boolean>((resolve) => {
      refreshResolve = resolve;
    });

    jest.spyOn(useAuthStore.getState(), 'refreshSession').mockImplementationOnce(() => refreshPromise);

    const callCounts: Record<string, number> = { '/res-1': 0, '/res-2': 0 };

    AXIOS_INSTANCE.defaults.adapter = async (config) => {
      const url = config.url || '';
      callCounts[url] = (callCounts[url] || 0) + 1;

      if (callCounts[url] === 1) {
        const error = new Error('401 Unauthorized') as AxiosError;
        error.config = config;
        error.response = {
          data: { error: { code: 'UNAUTHORIZED', message: 'Expired' } },
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config,
        };
        throw error;
      }

      return {
        data: { id: url === '/res-1' ? 1 : 2 },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    const req1 = AXIOS_INSTANCE.get('/res-1');
    const req2 = AXIOS_INSTANCE.get('/res-2');

    // Complete refresh
    refreshResolve!(true);

    const [res1, res2] = await Promise.all([req1, req2]);

    expect(res1.data).toEqual({ id: 1 });
    expect(res2.data).toEqual({ id: 2 });
    expect(callCounts['/res-1']).toBe(2);
    expect(callCounts['/res-2']).toBe(2);
  });

  it('strictly limits retry to 1 and rejects if retry still returns 401 (loop prevention)', async () => {
    jest.spyOn(useAuthStore.getState(), 'refreshSession').mockResolvedValue(true);

    let callCount = 0;
    AXIOS_INSTANCE.defaults.adapter = async (config) => {
      callCount++;
      const error = new Error('Persistent 401') as AxiosError;
      error.config = config;
      error.response = {
        data: { error: { code: 'UNAUTHORIZED', message: 'Persistent 401' } },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
      };
      throw error;
    };

    await expect(AXIOS_INSTANCE.get('/loop-endpoint')).rejects.toEqual({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Persistent 401', details: undefined },
      meta: {},
    });

    // Exactly 2 calls: 1 initial + 1 retry
    expect(callCount).toBe(2);
  });

  describe('normalizeError', () => {
    it('normalizes structured error payloads', () => {
      const errorObj = {
        message: 'Request failed',
        response: {
          status: 404,
          data: {
            success: false,
            error: { code: 'NOT_FOUND', message: 'Item not found' },
            meta: { traceId: 'tr_1' },
          },
        },
      } as unknown as AxiosError;

      expect(normalizeError(errorObj)).toEqual({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Item not found', details: undefined },
        meta: { traceId: 'tr_1' },
      });
    });

    it('falls back gracefully when response payload is generic', () => {
      const errorObj = {
        code: 'ERR_NETWORK',
        message: 'Network Error',
      } as unknown as AxiosError;

      expect(normalizeError(errorObj)).toEqual({
        success: false,
        error: { code: 'ERR_NETWORK', message: 'Network Error' },
        meta: {},
      });
    });
  });
});
