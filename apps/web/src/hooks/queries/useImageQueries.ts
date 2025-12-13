/**
 * 图片相关的React Query hooks
 * 
 * 用于替换手动的图片缓存，消除重复请求
 */

import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api-client';
import { createLogger } from '@/lib/logger';

const imageLogger = createLogger('Image');

// 全局blob URL缓存，避免重复创建和过早释放
const blobUrlCache = new Map<string, string>();

// 持久化缓存键前缀
const CACHE_PREFIX = 'zhiweijz_image_cache_';
const CACHE_EXPIRY_PREFIX = 'zhiweijz_image_expiry_';

/**
 * 从localStorage获取缓存的图片数据并重新创建blob URL
 */
async function getCachedImageData(url: string): Promise<string | null> {
  try {
    const expiryKey = CACHE_EXPIRY_PREFIX + btoa(url);
    const cacheKey = CACHE_PREFIX + btoa(url);
    
    const expiry = localStorage.getItem(expiryKey);
    if (!expiry || Date.now() > parseInt(expiry)) {
      // 缓存已过期，清理
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(expiryKey);
      return null;
    }
    
    const cachedBase64 = localStorage.getItem(cacheKey);
    if (cachedBase64) {
      imageLogger.debug('使用localStorage缓存的图片数据');
      
      // 将base64转换回blob并创建新的blob URL
      const byteCharacters = atob(cachedBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      const blobUrl = URL.createObjectURL(blob);
      
      return blobUrl;
    }
  } catch (error) {
    imageLogger.warn('读取localStorage缓存失败', error);
  }
  return null;
}

/**
 * 将图片blob数据转换为base64并缓存到localStorage
 */
async function setCachedImageData(url: string, blob: Blob): Promise<void> {
  try {
    const expiryKey = CACHE_EXPIRY_PREFIX + btoa(url);
    const cacheKey = CACHE_PREFIX + btoa(url);
    
    // 将blob转换为base64
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const result = reader.result as string;
        // 移除data:image/jpeg;base64,前缀
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
    
    reader.readAsDataURL(blob);
    const base64 = await base64Promise;
    
    // 设置1小时过期时间
    const expiry = Date.now() + (60 * 60 * 1000);
    
    localStorage.setItem(cacheKey, base64);
    localStorage.setItem(expiryKey, expiry.toString());
    
    imageLogger.debug('图片数据已缓存到localStorage');
  } catch (error) {
    imageLogger.warn('缓存图片数据到localStorage失败', error);
  }
}

// 查询键常量
export const IMAGE_KEYS = {
  all: ['image'] as const,
  blob: (url: string) => [...IMAGE_KEYS.all, 'blob', url] as const,
} as const;

/**
 * 获取图片blob数据
 */
export function useImageBlob(url: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: IMAGE_KEYS.blob(url || ''),
    queryFn: async (): Promise<string> => {
      if (!url) throw new Error('图片URL不能为空');
      
      // 1. 检查内存缓存
      const cachedBlobUrl = blobUrlCache.get(url);
      if (cachedBlobUrl) {
        imageLogger.debug('使用内存缓存的blob URL');
        return cachedBlobUrl;
      }
      
      // 2. 检查localStorage缓存
      const persistedBlobUrl = await getCachedImageData(url);
      if (persistedBlobUrl) {
        // 恢复到内存缓存
        blobUrlCache.set(url, persistedBlobUrl);
        return persistedBlobUrl;
      }
      
      imageLogger.debug('开始加载图片', { 
        url: url.length > 50 ? url.substring(0, 50) + '...' : url 
      });

      const response = await fetchApi(url, {
        method: 'GET',
        mode: 'cors',
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
          throw new Error(`图片加载失败: ${response.status} ${response.statusText}`);
        }
      }

      const blob = await response.blob();

      // 验证blob是否为有效图片
      if (!blob.type.startsWith('image/')) {
        throw new Error(`无效的图片格式: ${blob.type}`);
      }

      const blobUrl = URL.createObjectURL(blob);
      
      // 缓存到内存和localStorage
      blobUrlCache.set(url, blobUrl);
      setCachedImageData(url, blob); // 缓存原始blob数据，不是URL
      
      imageLogger.debug('图片加载成功，已缓存到内存和localStorage');
      return blobUrl;
    },
    enabled: enabled && !!url,
    staleTime: 60 * 60 * 1000, // 1小时内认为数据是新鲜的（图片很少变化）
    gcTime: 24 * 60 * 60 * 1000, // 24小时后清理缓存
    retry: 2,
    retryDelay: 1000,
    // 图片加载失败时不要无限重试
    retryOnMount: false,
  });
}

/**
 * 清理blob URL缓存（可选，用于内存管理）
 */
export function clearBlobUrlCache() {
  imageLogger.debug('清理blob URL缓存', { count: blobUrlCache.size });
  
  for (const [url, blobUrl] of blobUrlCache.entries()) {
    URL.revokeObjectURL(blobUrl);
  }
  
  blobUrlCache.clear();
}

/**
 * 检查URL是否需要认证
 */
export function needsAuthentication(url: string): boolean {
  if (url.startsWith('/api/')) return true;
  if (url.includes('/api/')) return true;
  return false;
}