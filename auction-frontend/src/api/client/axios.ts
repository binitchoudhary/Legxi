import Axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/features/auth/store/authStore';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface ApiErrorPayload {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: Record<string, unknown>;
}

// Extend AxiosRequestConfig to include _retry flag
export interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
  body?: unknown;
}

export const AXIOS_INSTANCE = Axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || '/api/proxy',
  timeout: 15000,
  withCredentials: true,
});

let isRefreshing = false;
let refreshSubscribers: Array<(success: boolean) => void> = [];

function subscribeTokenRefresh(cb: (success: boolean) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(success: boolean) {
  refreshSubscribers.forEach((cb) => cb(success));
  refreshSubscribers = [];
}

// Request Interceptor: Attach correlation ID and ensure no browser token headers are injected
AXIOS_INSTANCE.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (!config.headers['x-correlation-id']) {
    config.headers['x-correlation-id'] = generateUUID();
  }
  if (!config.headers['x-request-id']) {
    config.headers['x-request-id'] = generateUUID();
  }
  return config;
});

// Response Interceptor: Automatic 401 refresh queue with shared promise and single retry
AXIOS_INSTANCE.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and request hasn't been retried yet
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Don't intercept 401 on login or refresh endpoints themselves
      if (
        originalRequest.url?.includes('/api/auth/login') ||
        originalRequest.url?.includes('/api/auth/refresh') ||
        originalRequest.url?.includes('/api/auth/session')
      ) {
        return Promise.reject(normalizeError(error));
      }

      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;

        try {
          const success = await useAuthStore.getState().refreshSession();
          isRefreshing = false;
          onRefreshed(success);

          if (success) {
            return AXIOS_INSTANCE(originalRequest as AxiosRequestConfig);
          } else {
            return Promise.reject(normalizeError(error));
          }
        } catch {
          isRefreshing = false;
          onRefreshed(false);
          return Promise.reject(normalizeError(error));
        }
      }

      // If a refresh is already in-flight, queue this request
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((success: boolean) => {
          if (success) {
            resolve(AXIOS_INSTANCE(originalRequest as AxiosRequestConfig));
          } else {
            reject(normalizeError(error));
          }
        });
      });
    }

    return Promise.reject(normalizeError(error));
  }
);

export function normalizeError(error: AxiosError): ApiErrorPayload {
  if (error.response?.data && typeof error.response.data === 'object') {
    const data = error.response.data as Record<string, unknown>;
    if (data.error && typeof data.error === 'object') {
      return {
        success: false,
        error: {
          code: (data.error as Record<string, unknown>).code as string || 'API_ERROR',
          message: (data.error as Record<string, unknown>).message as string || error.message,
          details: (data.error as Record<string, unknown>).details,
        },
        meta: (data.meta as Record<string, unknown>) || {},
      };
    }
  }

  return {
    success: false,
    error: {
      code: error.code || 'HTTP_ERROR',
      message: error.message || 'An unexpected error occurred',
    },
    meta: {},
  };
}

// Orval / TanStack Query mutator function
export const customAxiosInstance = async <T>(
  config: CustomAxiosRequestConfig | string,
  options?: CustomAxiosRequestConfig
): Promise<T> => {
  let finalConfig: CustomAxiosRequestConfig;
  if (typeof config === 'string') {
    finalConfig = { url: config, ...options };
  } else {
    finalConfig = { ...config, ...options };
  }

  if (finalConfig.body) {
    finalConfig.data = finalConfig.body;
    delete finalConfig.body;
  }

  const response = await AXIOS_INSTANCE(finalConfig);
  return response.data as T;
};
