'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';

interface AuthenticatedImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: (img?: HTMLImageElement) => void;
  onError?: (error: Error) => void;
  fallback?: React.ReactNode;
}

/**
 * 支持认证的图片组件
 * 使用fetch获取需要认证的图片，然后转换为blob URL显示
 */
export function AuthenticatedImage({
  src,
  alt,
  className,
  style,
  onLoad,
  onError,
  fallback,
}: AuthenticatedImageProps) {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 获取认证token
  const { token } = useAuthStore();

  // 稳定化回调函数 - 使用ref来避免依赖项变化
  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);

  // 更新ref
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
    // 如果是相对路径且指向API，需要认证
    if (url.startsWith('/api/')) return true;
    // 如果是完整URL且指向后端API，需要认证
    if (url.includes('/api/')) return true;
    return false;
  };

  // 加载图片
  useEffect(() => {
    if (!src) {
      setBlobUrl('');
      setError(null);
      return;
    }

    // 如果不需要认证，直接使用原URL
    if (!needsAuthentication(src)) {
      setBlobUrl(src);
      setError(null);
      return;
    }

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 创建新的AbortController
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const loadImage = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 直接使用auth store中的token
        if (!token) {
          console.warn('🖼️ 未找到认证token，auth store token:', token);
          throw new Error('未找到认证token');
        }

        console.log('🖼️ 开始加载认证图片:', src, '有token:', !!token);

        const response = await fetch(src, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal,
        });

        if (!response.ok) {
          throw new Error(`图片加载失败: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();

        // 检查是否被取消
        if (signal.aborted) return;

        const url = URL.createObjectURL(blob);
        setBlobUrl(url);

        console.log('✅ 认证图片加载成功:', src);

        // 创建临时img元素获取图片尺寸信息
        const tempImg = new Image();
        tempImg.onload = () => {
          stableOnLoad(tempImg);
        };
        tempImg.onerror = () => {
          stableOnLoad(); // 如果临时图片加载失败，仍然调用onLoad但不传递参数
        };
        tempImg.src = url;
      } catch (err) {
        if (signal.aborted) return; // 忽略取消的请求

        const error = err instanceof Error ? err : new Error('图片加载失败');
        console.error('❌ 认证图片加载失败:', src, error);

        setError(error);
        stableOnError(error);
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadImage();

    // 清理函数
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // 清理blob URL
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [src, stableOnLoad, stableOnError]);

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
        className={`flex items-center justify-center bg-gray-100 ${className || ''}`}
        style={style}
      >
        <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
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
        className={`flex items-center justify-center bg-red-50 text-red-600 text-xs ${className || ''}`}
        style={style}
        title={error.message}
      >
        ❌
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
        console.log('🖼️ 图片渲染完成:', src);
        onLoadRef.current?.();
      }}
      onError={(e) => {
        console.error('🖼️ 图片渲染失败:', src, e);
        const error = new Error('图片渲染失败');
        setError(error);
        onErrorRef.current?.(error);
      }}
    />
  );
}

/**
 * 认证图片的Hook版本
 * 返回处理后的图片URL和加载状态
 */
export function useAuthenticatedImage(src: string) {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!src) {
      setBlobUrl('');
      setError(null);
      return;
    }

    // 如果不需要认证，直接使用原URL
    if (!src.startsWith('/api/') && !src.includes('/api/')) {
      setBlobUrl(src);
      setError(null);
      return;
    }

    const loadImage = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('auth-token');
        if (!token) {
          throw new Error('未找到认证token');
        }

        const response = await fetch(src, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`图片加载失败: ${response.status}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('图片加载失败');
        setError(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();

    // 清理函数
    return () => {
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [src]);

  return { blobUrl, isLoading, error };
}
