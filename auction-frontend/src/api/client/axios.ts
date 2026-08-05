import Axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';

export const AXIOS_INSTANCE = Axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || '/api/proxy',
  timeout: 10000,
});

AXIOS_INSTANCE.interceptors.request.use((config) => {
  // Generate unique IDs for every outbound request required by backend
  if (!config.headers['x-correlation-id']) {
    config.headers['x-correlation-id'] = uuidv4();
  }
  if (!config.headers['x-request-id']) {
    config.headers['x-request-id'] = uuidv4();
  }
  return config;
});

// Centralized error normalization
AXIOS_INSTANCE.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const errorPayload = error.response?.data || {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
      meta: {},
    };
    return Promise.reject(errorPayload);
  }
);

export type CustomAxiosRequestConfig = AxiosRequestConfig & {
  body?: any;
};

// Orval Mutator function wrapper
export const customAxiosInstance = async <T>(
  config: CustomAxiosRequestConfig | string,
  options?: CustomAxiosRequestConfig
): Promise<T> => {
  const source = Axios.CancelToken.source();
  
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

  const promise = AXIOS_INSTANCE({
    ...finalConfig,
    cancelToken: source.token,
  });

  // Allow TanStack Query to cancel the request
  // @ts-expect-error adding cancel property
  promise.cancel = () => {
    source.cancel('Query was cancelled');
  };

  return promise as unknown as Promise<T>;
};
