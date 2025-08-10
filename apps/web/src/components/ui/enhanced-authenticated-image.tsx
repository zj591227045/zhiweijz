'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Capacitor } from '@capacitor/core';
import { fetchApi } from '@/lib/api-client';

interface EnhancedAuthenticatedImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: (img?: HTMLImageElement) => void;
  onError?: (error: Error) => void;
  fallback?: React.ReactNode;
  retryCount?: number; // 重试次数
  timeout?: number; // 超时时间（毫秒）
}

/**
 * 增强的认证图片组件
 * 专门处理Android release版本的网络问题
 */
export function EnhancedAuthenticatedImage({
  src,
  alt,
  className,
  style,
  onLoad,
  onError,
  fallback,
  retryCount = 3,
  timeout = 10000,
}: EnhancedAuthenticatedImageProps) {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentRetry, setCurrentRetry] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 获取认证token
  const { token } = useAuthStore();

  // 稳定化回调函数
  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onLoadRef.current = onLoad;
    onErrorRef.current = onError;
  });

  const stableOnLoad = useCallback((img?: HTMLImageElement) => {
    onLoadRef.current?.(img);
  }, []);

  const stableOnError = useCallback((error: Error) => {
    onErrorRef.current?.(error);
  }, []);

  // 检查是否需要认证
  const needsAuthentication = (url: string): boolean => {
    if (url.startsWith('/api/')) return true;
    if (url.includes('/api/')) return true;
    return false;
  };

  // 获取增强的fetch选项（针对Android优化）
  const getEnhancedFetchOptions = (signal: AbortSignal): RequestInit => {
    // 完全移除自定义请求头，让fetchApi函数自动处理认证
    const options: RequestInit = {
      method: 'GET',
      signal,
      mode: 'cors',
      // 移除 credentials: 'include' 以避免CORS问题
      // credentials: 'include',
      redirect: 'follow',
    };

    return options;
  };

  // 加载图片（带重试机制）
  const loadImageWithRetry = useCallback(async (url: string, retry: number = 0): Promise<void> => {
    if (retry > retryCount) {
      throw new Error(`图片加载失败，已重试${retryCount}次`);
    }

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 创建新的AbortController
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // 设置超时
    const timeoutId = setTimeout(() => {
      abortControllerRef.current?.abort();
    }, timeout);

    try {
      console.log(`🖼️ [Enhanced] 开始加载图片 (重试${retry}/${retryCount}):`, url);

      const options = getEnhancedFetchOptions(signal);
      
      // 使用动态API客户端的fetchApi而不是原生fetch
      const response = await fetchApi(url, options);

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('认证失败，请重新登录');
        } else if (response.status === 404) {
          throw new Error('图片不存在');
        } else if (response.status >= 500) {
          throw new Error(`服务器错误: ${response.status}`);
        } else {
          throw new Error(`图片加载失败: ${response.status} ${response.statusText}`);
        }
      }

      const blob = await response.blob();

      // 检查是否被取消
      if (signal.aborted) return;

      // 验证blob是否为有效图片
      if (!blob.type.startsWith('image/')) {
        throw new Error(`无效的图片格式: ${blob.type}`);
      }

      const blobUrl = URL.createObjectURL(blob);
      setBlobUrl(blobUrl);
      setError(null);
      setCurrentRetry(0);

      console.log('✅ [Enhanced] 认证图片加载成功:', url);

      // 创建临时img元素获取图片尺寸信息
      const tempImg = new Image();
      tempImg.onload = () => {
        stableOnLoad(tempImg);
      };
      tempImg.onerror = () => {
        stableOnLoad();
      };
      tempImg.src = blobUrl;

    } catch (err) {
      clearTimeout(timeoutId);
      
      if (signal.aborted) return;

      const error = err instanceof Error ? err : new Error('图片加载失败');
      console.error(`❌ [Enhanced] 图片加载失败 (重试${retry}/${retryCount}):`, url, error);

      // 如果是网络错误且还有重试次数，则重试
      if (retry < retryCount && (
        error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('timeout') ||
        error.message.includes('服务器错误')
      )) {
        console.log(`🔄 [Enhanced] 准备重试加载图片，延迟${(retry + 1) * 1000}ms`);
        setCurrentRetry(retry + 1);
        
        // 延迟重试
        setTimeout(() => {
          loadImageWithRetry(url, retry + 1);
        }, (retry + 1) * 1000);
      } else {
        setError(error);
        stableOnError(error);
      }
    }
  }, [token, retryCount, timeout, stableOnLoad, stableOnError]);

  // 主加载逻辑
  useEffect(() => {
    if (!src) {
      setBlobUrl('');
      setError(null);
      setCurrentRetry(0);
      return;
    }

    // 如果不需要认证，直接使用原URL
    if (!needsAuthentication(src)) {
      setBlobUrl(src);
      setError(null);
      setCurrentRetry(0);
      return;
    }

    // 检查token
    if (!token) {
      const error = new Error('未找到认证token');
      setError(error);
      stableOnError(error);
      return;
    }

    setIsLoading(true);
    setError(null);
    setCurrentRetry(0);

    loadImageWithRetry(src, 0).finally(() => {
      setIsLoading(false);
    });

    // 清理函数
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [src, token, loadImageWithRetry, stableOnError]);

  // 清理blob URL
  useEffect(() => {
    return () => {
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gray-100 ${className || ''}`}
        style={style}
      >
        <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full mb-1"></div>
        {currentRetry > 0 && (
          <div className="text-xs text-gray-500">重试中 {currentRetry}/{retryCount}</div>
        )}
      </div>
    );
  }

  // 如果有错误，显示错误状态或fallback
  if (error) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div
        className={`flex flex-col items-center justify-center bg-red-50 text-red-600 text-xs p-2 ${className || ''}`}
        style={style}
        title={error.message}
      >
        <div>❌</div>
        <div className="text-center mt-1">{error.message}</div>
      </div>
    );
  }

  // 如果没有URL，显示空状态
  if (!blobUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 ${className || ''}`}
        style={style}
      >
        <span className="text-gray-400 text-xs">无图片</span>
      </div>
    );
  }

  // 显示图片
  return (
    <img
      src={blobUrl}
      alt={alt}
      className={className}
      style={style}
      onLoad={() => {
        console.log('🖼️ [Enhanced] 图片渲染完成:', src);
        onLoadRef.current?.();
      }}
      onError={(e) => {
        console.error('🖼️ [Enhanced] 图片渲染失败:', src, e);
        const error = new Error('图片渲染失败');
        setError(error);
        onErrorRef.current?.(error);
      }}
    />
  );
}
