/**
 * 图片代理工具函数
 * 智能处理S3存储访问，根据协议和安全策略选择最优访问方式：
 * - HTTPS + 公开访问：直接访问（性能最佳）
 * - HTTPS + 需要认证：预签名URL（安全 + 性能）
 * - HTTP：代理访问（解决混合内容问题）
 */

import {
  getAccessMethod,
  shouldUseDirectAccess,
  requiresAuthentication,
  getPresignedUrlTTL,
  debugAccessPolicy
} from './s3-access-config';

/**
 * 获取动态API基础URL
 * 从localStorage中读取服务器配置
 */
function getApiBaseUrl(): string {
  // 在服务端渲染时，返回默认值
  if (typeof window === 'undefined') {
    return '/api';
  }

  try {
    // 直接从LocalStorage读取服务器配置
    const storedConfig = localStorage.getItem('server-config-storage');
    if (storedConfig) {
      try {
        const parsedConfig = JSON.parse(storedConfig);
        const apiUrl = parsedConfig?.state?.config?.currentUrl || '/api';
        return apiUrl;
      } catch (parseError) {
        console.warn('⚠️ 解析服务器配置失败:', parseError);
      }
    }

    // 回退到相对路径
    return '/api';
  } catch (error) {
    console.warn('⚠️ 获取服务器配置失败，使用默认值:', error);
    return '/api';
  }
}

/**
 * 将S3 URL转换为代理API URL
 * @param s3Url S3存储的直接URL
 * @returns 代理API URL
 */
export function convertS3UrlToProxy(s3Url: string): string {
  if (!s3Url || !s3Url.startsWith('http')) {
    return s3Url; // 如果不是HTTP URL，直接返回
  }

  try {
    // 解析S3 URL，提取bucket和key
    // 格式: http://endpoint/bucket/key/path
    const url = new URL(s3Url);
    const pathParts = url.pathname.split('/').filter(part => part.length > 0);

    if (pathParts.length < 2) {
      console.warn('无效的S3 URL格式:', s3Url);
      return s3Url;
    }

    const bucket = pathParts[0];
    const key = pathParts.slice(1).join('/');

    // 获取动态API基础URL并构建代理API URL
    const apiBaseUrl = getApiBaseUrl();
    const proxyUrl = `${apiBaseUrl}/image-proxy/s3/${bucket}/${key}`;

    console.log('🔄 S3 URL转换为代理URL:', { original: s3Url, proxy: proxyUrl, apiBaseUrl });

    return proxyUrl;
  } catch (error) {
    console.error('S3 URL转换失败:', error, s3Url);
    return s3Url; // 转换失败时返回原URL
  }
}

/**
 * 获取用户头像的代理URL
 * @param userId 用户ID
 * @returns 用户头像代理API URL
 */
export function getUserAvatarProxyUrl(userId: string): string {
  const apiBaseUrl = getApiBaseUrl();
  return `${apiBaseUrl}/image-proxy/avatar/${userId}`;
}

/**
 * 检查URL是否是S3直接URL
 * @param url 要检查的URL
 * @returns 是否是S3直接URL
 */
export function isS3DirectUrl(url: string): boolean {
  if (!url || !url.startsWith('http')) {
    return false;
  }

  try {
    const urlObj = new URL(url);
    // 检查是否包含常见的S3端点模式
    return urlObj.hostname.includes('amazonaws.com') || 
           urlObj.hostname.includes('minio') ||
           urlObj.port === '9000' || // 常见的MinIO端口
           urlObj.pathname.includes('/avatars/') ||
           urlObj.pathname.includes('/transaction-attachments/');
  } catch {
    return false;
  }
}

/**
 * 检查URL是否使用HTTPS协议
 * @param url 要检查的URL
 * @returns 是否使用HTTPS
 */
export function isHttpsUrl(url: string): boolean {
  return url.startsWith('https://');
}

// 缓存处理结果，避免重复计算
const urlProcessCache = new Map<string, string>();

/**
 * 智能处理头像URL
 * 根据S3访问策略选择最优访问方式：
 * - HTTPS + 公开访问：直接访问（性能最佳）
 * - HTTPS + 需要认证：预签名URL（安全 + 性能）
 * - HTTP：代理访问（解决混合内容问题）
 * @param avatarUrl 头像URL
 * @param userId 用户ID（可选，用于用户头像代理）
 * @param enableDebug 是否启用调试信息
 * @returns 处理后的URL
 */
export function processAvatarUrl(avatarUrl: string, userId?: string, enableDebug: boolean = false): string {
  if (!avatarUrl) {
    return avatarUrl;
  }

  // 生成缓存键
  const cacheKey = `${avatarUrl}|${userId || ''}`;

  // 检查缓存
  if (urlProcessCache.has(cacheKey)) {
    return urlProcessCache.get(cacheKey)!;
  }

  let result = avatarUrl;

  // 如果已经是代理URL，直接返回
  if (avatarUrl.startsWith('/api/image-proxy/')) {
    result = avatarUrl;
  }
  // 如果是预设头像ID或emoji，直接返回
  else if (!avatarUrl.startsWith('http')) {
    result = avatarUrl;
  }
  // 如果是S3直接URL，使用智能访问策略
  else if (isS3DirectUrl(avatarUrl)) {
    if (enableDebug) {
      debugAccessPolicy(avatarUrl);
    }

    const accessMethod = getAccessMethod(avatarUrl);

    switch (accessMethod.method) {
      case 'direct':
        if (enableDebug) {
          console.log('✅ 直接访问S3资源:', avatarUrl, '原因:', accessMethod.reason);
        }
        result = avatarUrl;
        break;

      case 'presigned':
        if (enableDebug) {
          console.log('🔑 需要预签名URL访问:', avatarUrl, '原因:', accessMethod.reason);
        }
        // 注意：这里返回原URL，实际的预签名URL生成应该在组件中异步处理
        // 因为这个函数是同步的，不能进行异步API调用
        result = avatarUrl;
        break;

      case 'proxy':
        if (enableDebug) {
          console.log('🔄 使用代理访问:', avatarUrl, '原因:', accessMethod.reason);
        }
        if (userId) {
          result = getUserAvatarProxyUrl(userId);
        } else {
          result = convertS3UrlToProxy(avatarUrl);
        }
        break;

      default:
        if (enableDebug) {
          console.warn('⚠️ 未知访问方式，回退到直接访问:', avatarUrl);
        }
        result = avatarUrl;
    }
  }
  // 其他情况直接返回原URL
  else {
    result = avatarUrl;
  }

  // 缓存结果
  urlProcessCache.set(cacheKey, result);

  // 限制缓存大小
  if (urlProcessCache.size > 100) {
    const firstKey = urlProcessCache.keys().next().value;
    urlProcessCache.delete(firstKey);
  }

  return result;
}

/**
 * 为需要认证的HTTPS S3资源生成预签名URL
 * @param s3Url S3存储的直接URL
 * @param expiresIn 过期时间（秒），默认1小时
 * @returns Promise<string> 预签名URL
 */
export async function generatePresignedUrl(s3Url: string, expiresIn: number = 3600): Promise<string> {
  if (!isS3DirectUrl(s3Url) || !isHttpsUrl(s3Url)) {
    return s3Url;
  }

  try {
    // 解析S3 URL获取bucket和key
    const url = new URL(s3Url);
    const pathParts = url.pathname.split('/').filter(part => part.length > 0);

    if (pathParts.length < 2) {
      console.warn('无效的S3 URL格式:', s3Url);
      return s3Url;
    }

    const bucket = pathParts[0];
    const key = pathParts.slice(1).join('/');

    // 调用后端API生成预签名URL
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/files/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucket,
        key,
        operation: 'GET',
        expiresIn,
      }),
    });

    if (!response.ok) {
      throw new Error(`生成预签名URL失败: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('🔑 生成预签名URL成功:', { original: s3Url, presigned: data.data.url });

    return data.data.url;
  } catch (error) {
    console.error('生成预签名URL失败，回退到原URL:', error);
    return s3Url;
  }
}

/**
 * 处理图片加载错误的回调函数
 * @param event 错误事件
 * @param fallbackUrl 备用URL
 */
export function handleImageError(event: Event, fallbackUrl?: string): void {
  const img = event.target as HTMLImageElement;
  
  console.warn('图片加载失败:', img.src);
  
  if (fallbackUrl && img.src !== fallbackUrl) {
    console.log('尝试使用备用URL:', fallbackUrl);
    img.src = fallbackUrl;
  } else {
    // 如果没有备用URL或备用URL也失败，显示默认占位符
    img.style.display = 'none';
    
    // 可以在这里添加显示默认头像的逻辑
    const parent = img.parentElement;
    if (parent && !parent.querySelector('.avatar-fallback')) {
      const fallback = document.createElement('div');
      fallback.className = 'avatar-fallback w-full h-full flex items-center justify-center bg-gray-200 rounded-full text-gray-600';
      fallback.textContent = '头像';
      parent.appendChild(fallback);
    }
  }
}

/**
 * 预加载图片
 * @param url 图片URL
 * @returns Promise，成功时resolve，失败时reject
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`图片预加载失败: ${url}`));
    img.src = url;
  });
}
