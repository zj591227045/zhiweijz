/**
 * 图片缓存管理hook
 * 
 * 解决认证图片的缓存问题，避免重复请求
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchApi } from '@/lib/api-client';
import { createLogger } from '@/lib/logger';

const imageLogger = createLogger('ImageCache');

// 内存缓存
const imageCache = new Map<string, string>();
const loadingPromises = new Map<string, Promise<string>>();

/**
 * 图片缓存hook
 * 
 * 提供内存级别的图片缓存，避免重复的网络请求
 */
export function useImageCache(src: string) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!src) return;

    // 检查内存缓存
    const cached = imageCache.get(src);
    if (cached) {
      imageLogger.debug('使用缓存图片', { 
        url: src.substring(0, 50) + '...' 
      });
      setBlobUrl(cached);
      setIsLoading(false);
      setError(null);
      return;
    }

    // 检查是否正在加载
    const loadingPromise = loadingPromises.get(src);
    if (loadingPromise) {
      imageLogger.debug('图片正在加载中，等待完成', { 
        url: src.substring(0, 50) + '...' 
      });
      
      loadingPromise
        .then(url => {
          setBlobUrl(url);
          setIsLoading(false);
          setError(null);
        })
        .catch(err => {
          setError(err);
          setIsLoading(false);
        });
      return;
    }

    // 开始加载图片
    setIsLoading(true);
    setError(null);

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const loadPromise = loadImage(src, signal);
    loadingPromises.set(src, loadPromise);

    loadPromise
      .then(url => {
        if (!signal.aborted) {
          // 缓存成功加载的图片
          imageCache.set(src, url);
          setBlobUrl(url);
          setIsLoading(false);
          setError(null);
          
          imageLogger.debug('图片加载并缓存成功', { 
            url: src.substring(0, 50) + '...',
            cacheSize: imageCache.size
          });
        }
      })
      .catch(err => {
        if (!signal.aborted) {
          setError(err);
          setIsLoading(false);
          imageLogger.warn('图片加载失败', { 
            url: src.substring(0, 50) + '...',
            error: err.message 
          });
        }
      })
      .finally(() => {
        loadingPromises.delete(src);
      });

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [src]);

  // 清理blob URL
  useEffect(() => {
    return () => {
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  return { blobUrl, isLoading, error };
}

/**
 * 加载单个图片
 */
async function loadImage(src: string, signal: AbortSignal): Promise<string> {
  const response = await fetchApi(src, {
    method: 'GET',
    signal,
    redirect: 'follow',
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('认证失败，请重新登录');
    } else if (response.status === 404) {
      throw new Error('图片不存在');
    } else if (response.status >= 500) {
      throw new Error(`服务器错误: ${response.status}`);
    } else {
      throw new Error(`图片加载失败: ${response.status}`);
    }
  }

  const blob = await response.blob();

  if (!blob.type.startsWith('image/')) {
    throw new Error(`无效的图片格式: ${blob.type}`);
  }

  return URL.createObjectURL(blob);
}

/**
 * 清理图片缓存
 */
export function clearImageCache() {
  imageLogger.info('清理图片缓存', { size: imageCache.size });
  
  // 释放所有blob URL
  for (const blobUrl of imageCache.values()) {
    if (blobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrl);
    }
  }
  
  imageCache.clear();
  loadingPromises.clear();
}

/**
 * 预加载图片列表
 */
export async function preloadImages(urls: string[]): Promise<void> {
  imageLogger.debug('开始预加载图片', { count: urls.length });
  
  const promises = urls
    .filter(url => !imageCache.has(url)) // 只加载未缓存的图片
    .map(url => {
      const controller = new AbortController();
      return loadImage(url, controller.signal)
        .then(blobUrl => {
          imageCache.set(url, blobUrl);
        })
        .catch(error => {
          imageLogger.warn('预加载图片失败', { 
            url: url.substring(0, 50) + '...',
            error: error.message 
          });
        });
    });

  await Promise.allSettled(promises);
  
  imageLogger.debug('图片预加载完成', { 
    total: urls.length,
    cached: imageCache.size 
  });
}

// 开发环境下暴露到全局，方便调试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).imageCache = {
    cache: imageCache,
    clear: clearImageCache,
    preload: preloadImages,
    size: () => imageCache.size,
  };
}