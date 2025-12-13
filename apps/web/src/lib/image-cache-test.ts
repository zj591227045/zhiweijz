/**
 * 图片缓存测试工具
 * 
 * 用于验证图片缓存的效果
 */

import { createLogger } from './logger';

const testLogger = createLogger('ImageCacheTest');

/**
 * 测试图片缓存效果
 */
export function runImageCacheTest() {
  if (typeof window === 'undefined') return;

  testLogger.info('=== 图片缓存测试开始 ===');

  // 监听网络请求
  const originalFetch = window.fetch;
  const requestLog: { url: string; timestamp: number }[] = [];

  window.fetch = async (...args) => {
    const url = args[0] as string;
    if (url.includes('/image-proxy/')) {
      requestLog.push({ url, timestamp: Date.now() });
      testLogger.debug('图片请求', { 
        url: url.substring(url.lastIndexOf('/') + 1, url.indexOf('?') || url.length) 
      });
    }
    return originalFetch(...args);
  };

  // 5秒后统计结果
  setTimeout(() => {
    const imageRequests = requestLog.filter(req => req.url.includes('/image-proxy/'));
    const uniqueImages = new Set(imageRequests.map(req => req.url)).size;
    
    testLogger.info('图片缓存测试结果', {
      总请求数: imageRequests.length,
      唯一图片数: uniqueImages,
      重复请求数: imageRequests.length - uniqueImages,
      缓存命中率: uniqueImages > 0 ? `${((uniqueImages / imageRequests.length) * 100).toFixed(1)}%` : '0%'
    });

    if (imageRequests.length - uniqueImages > 0) {
      testLogger.warn('发现重复请求，缓存可能未生效');
    } else {
      testLogger.info('✅ 缓存工作正常，无重复请求');
    }

    // 恢复原始fetch
    window.fetch = originalFetch;
    
    testLogger.info('=== 图片缓存测试完成 ===');
  }, 5000);
}

// 开发环境下自动运行测试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // 延迟运行，等待页面加载完成
  setTimeout(() => {
    runImageCacheTest();
  }, 2000);
}