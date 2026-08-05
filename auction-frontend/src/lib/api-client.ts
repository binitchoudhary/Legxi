import { AXIOS_INSTANCE, CustomAxiosRequestConfig } from '@/api/client/axios';

/**
 * Standardized API client wrapper for application features.
 * Application components should use this client rather than calling direct `fetch()` for backend APIs.
 */
export const apiClient = {
  get: async <T>(url: string, config?: CustomAxiosRequestConfig): Promise<T> => {
    const response = await AXIOS_INSTANCE.get<T>(url, config);
    return response.data;
  },

  post: async <T>(url: string, data?: unknown, config?: CustomAxiosRequestConfig): Promise<T> => {
    const response = await AXIOS_INSTANCE.post<T>(url, data, config);
    return response.data;
  },

  put: async <T>(url: string, data?: unknown, config?: CustomAxiosRequestConfig): Promise<T> => {
    const response = await AXIOS_INSTANCE.put<T>(url, data, config);
    return response.data;
  },

  patch: async <T>(url: string, data?: unknown, config?: CustomAxiosRequestConfig): Promise<T> => {
    const response = await AXIOS_INSTANCE.patch<T>(url, data, config);
    return response.data;
  },

  delete: async <T>(url: string, config?: CustomAxiosRequestConfig): Promise<T> => {
    const response = await AXIOS_INSTANCE.delete<T>(url, config);
    return response.data;
  },
};
