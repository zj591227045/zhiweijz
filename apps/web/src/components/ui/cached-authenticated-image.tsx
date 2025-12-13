/**
 * 基于React Query的缓存认证图片组件
 * 
 * 简单、可靠的实现，消除重复请求
 */

'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useImageBlob, needsAuthentication } from '@/hooks/queries/useImageQueries';
import { createLogger } from '@/lib/logger';

const imageLogger = createLogger('Image');

interface CachedAuthenticatedImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: (img?: HTMLImageElement) => void;
  onError?: (error: Error) => void;
  fallback?: React.ReactNode;
}

/**
 * 缓存认证图片组件 - React Query版本
 * 
 * 特点：
 * 1. 自动去重相同URL的请求
 * 2. 智能缓存，避免重复加载
 * 3. 简单可靠，没有复杂的状态管理
 */
export function CachedAuthenticatedImage({
  src,
  alt,
  className,
  style,
  onLoad,
  onError,
  fallback,
}: CachedAuthenticatedImageProps) {
  const { token } = useAuthStore();
  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);

  // 更新回调引用
  useEffect(() => {
    onLoadRef.current = onLoad;
    onErrorRef.current = onError;
  });

  // 判断是否需要使用React Query加载
  const shouldUseQuery = needsAuthentication(src) && !!token;
  
  // 使用React Query获取图片
  const {
    data: blobUrl,
    isLoading,
    error,
  } = useImageBlob(src, shouldUseQuery);

  // 处理错误回调
  useEffect(() => {
    if (error && onErrorRef.current) {
      const errorObj = error instanceof Error ? error : new Error('图片加载失败');
      onErrorRef.current(errorObj);
    }
  }, [error]);

  // 处理成功回调
  useEffect(() => {
    if (blobUrl && onLoadRef.current) {
      // 创建临时img元素获取图片信息
      const tempImg = new Image();
      tempImg.onload = () => {
        onLoadRef.current?.(tempImg);
      };
      tempImg.onerror = () => {
        onLoadRef.current?.();
      };
      tempImg.src = blobUrl;
    }
  }, [blobUrl]);

  // 注意：不在这里清理blob URL，因为它们被全局缓存管理
  // React Query会在适当的时候清理缓存

  // 如果不需要认证，直接显示图片
  if (!shouldUseQuery) {
    if (!token && needsAuthentication(src)) {
      // 需要认证但没有token
      if (fallback) {
        return <>{fallback}</>;
      }
      return (
        <div
          className={`flex items-center justify-center bg-red-50 text-red-600 text-xs p-2 ${className || ''}`}
          style={style}
          title="需要登录"
        >
          <div>🔒</div>
        </div>
      );
    }

    // 不需要认证，直接显示
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={style}
        onLoad={() => {
          imageLogger.debug('图片渲染完成（直接加载）');
          onLoadRef.current?.();
        }}
        onError={(e) => {
          imageLogger.error('图片渲染失败（直接加载）', e);
          const error = new Error('图片渲染失败');
          onErrorRef.current?.(error);
        }}
      />
    );
  }

  // 正在加载
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

  // 加载失败
  if (error) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div
        className={`flex flex-col items-center justify-center bg-red-50 text-red-600 text-xs p-2 ${className || ''}`}
        style={style}
        title={error instanceof Error ? error.message : '图片加载失败'}
      >
        <div>❌</div>
        <div className="text-center mt-1">
          {error instanceof Error ? error.message : '图片加载失败'}
        </div>
      </div>
    );
  }

  // 没有数据
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
        imageLogger.debug('图片渲染完成（React Query）');
        onLoadRef.current?.();
      }}
      onError={(e) => {
        imageLogger.error('图片渲染失败（React Query）', e);
        const error = new Error('图片渲染失败');
        onErrorRef.current?.(error);
      }}
    />
  );
}