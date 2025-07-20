import { useState, useCallback } from 'react';
import { adminApi } from '@/lib/admin-api-client';

interface UseAdminApiReturn {
  adminApi: {
    get: (url: string, options?: { params?: Record<string, any> }) => Promise<any>;
    post: (url: string, data?: any) => Promise<any>;
    put: (url: string, data?: any) => Promise<any>;
    delete: (url: string) => Promise<any>;
  };
  isLoading: boolean;
  error: string | null;
}

export function useAdminApi(): UseAdminApiReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wrappedAdminApi = {
    get: useCallback(async (url: string, options?: { params?: Record<string, any> }) => {
      setIsLoading(true);
      setError(null);

      try {
        let response;
        if (options?.params) {
          response = await adminApi.getWithParams(url, options.params);
        } else {
          response = await adminApi.get(url);
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    }, []),

    post: useCallback(async (url: string, data?: any) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await adminApi.post(url, data);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        return responseData;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    }, []),

    put: useCallback(async (url: string, data?: any) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await adminApi.put(url, data);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        return responseData;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    }, []),

    delete: useCallback(async (url: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await adminApi.delete(url);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        return responseData;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    }, []),
  };

  return {
    adminApi: wrappedAdminApi,
    isLoading,
    error,
  };
}
