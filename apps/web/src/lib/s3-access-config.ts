/**
 * S3访问策略配置
 * 用于管理不同类型资源的访问方式
 */

export interface S3AccessPolicy {
  /** 是否需要认证 */
  requireAuth: boolean;
  /** 是否允许直接访问（仅HTTPS） */
  allowDirectAccess: boolean;
  /** 预签名URL过期时间（秒） */
  presignedUrlTTL: number;
  /** 是否使用代理访问HTTP资源 */
  proxyHttpAccess: boolean;
}

/**
 * 默认S3访问策略配置
 */
export const S3_ACCESS_POLICIES: Record<string, S3AccessPolicy> = {
  // 用户头像 - 公开访问，性能优先
  avatars: {
    requireAuth: false,
    allowDirectAccess: true,
    presignedUrlTTL: 3600, // 1小时
    proxyHttpAccess: true,
  },
  
  // 记账附件 - 需要认证，安全优先
  'transaction-attachments': {
    requireAuth: true,
    allowDirectAccess: true,
    presignedUrlTTL: 1800, // 30分钟
    proxyHttpAccess: true,
  },
  
  // 临时文件 - 需要认证，短期访问
  'temp-files': {
    requireAuth: true,
    allowDirectAccess: false, // 强制通过代理
    presignedUrlTTL: 300, // 5分钟
    proxyHttpAccess: true,
  },
  
  // 系统文件 - 需要认证，长期缓存
  'system-files': {
    requireAuth: true,
    allowDirectAccess: true,
    presignedUrlTTL: 7200, // 2小时
    proxyHttpAccess: true,
  },
};

/**
 * 根据S3 URL获取访问策略
 * @param s3Url S3存储URL
 * @returns 访问策略
 */
export function getS3AccessPolicy(s3Url: string): S3AccessPolicy {
  try {
    const url = new URL(s3Url);
    const pathParts = url.pathname.split('/').filter(part => part.length > 0);
    
    if (pathParts.length > 0) {
      const bucket = pathParts[0];
      const policy = S3_ACCESS_POLICIES[bucket];
      
      if (policy) {
        console.log(`📋 使用${bucket}存储桶的访问策略:`, policy);
        return policy;
      }
    }
  } catch (error) {
    console.warn('解析S3 URL失败:', error);
  }
  
  // 默认策略：需要认证，允许直接访问HTTPS
  const defaultPolicy: S3AccessPolicy = {
    requireAuth: true,
    allowDirectAccess: true,
    presignedUrlTTL: 3600,
    proxyHttpAccess: true,
  };
  
  console.log('📋 使用默认访问策略:', defaultPolicy);
  return defaultPolicy;
}

/**
 * 检查是否应该使用直接访问
 * @param s3Url S3存储URL
 * @returns 是否应该直接访问
 */
export function shouldUseDirectAccess(s3Url: string): boolean {
  const policy = getS3AccessPolicy(s3Url);
  
  // 只有HTTPS且策略允许时才直接访问
  return s3Url.startsWith('https://') && policy.allowDirectAccess;
}

/**
 * 检查是否需要认证
 * @param s3Url S3存储URL
 * @returns 是否需要认证
 */
export function requiresAuthentication(s3Url: string): boolean {
  const policy = getS3AccessPolicy(s3Url);
  return policy.requireAuth;
}

/**
 * 获取预签名URL过期时间
 * @param s3Url S3存储URL
 * @returns 过期时间（秒）
 */
export function getPresignedUrlTTL(s3Url: string): number {
  const policy = getS3AccessPolicy(s3Url);
  return policy.presignedUrlTTL;
}

/**
 * 检查是否应该代理HTTP访问
 * @param s3Url S3存储URL
 * @returns 是否应该代理HTTP访问
 */
export function shouldProxyHttpAccess(s3Url: string): boolean {
  const policy = getS3AccessPolicy(s3Url);
  return policy.proxyHttpAccess;
}

/**
 * 智能选择访问方式
 * @param s3Url S3存储URL
 * @returns 访问方式描述
 */
export function getAccessMethod(s3Url: string): {
  method: 'direct' | 'presigned' | 'proxy';
  reason: string;
  ttl?: number;
} {
  if (!s3Url.startsWith('http')) {
    return { method: 'direct', reason: '非HTTP URL' };
  }
  
  const isHttps = s3Url.startsWith('https://');
  const policy = getS3AccessPolicy(s3Url);
  
  if (!isHttps) {
    if (policy.proxyHttpAccess) {
      return { method: 'proxy', reason: 'HTTP协议，使用代理解决混合内容问题' };
    } else {
      return { method: 'direct', reason: 'HTTP协议，但策略不允许代理' };
    }
  }
  
  // HTTPS协议
  if (!policy.allowDirectAccess) {
    return { method: 'proxy', reason: 'HTTPS协议，但策略要求使用代理' };
  }
  
  if (policy.requireAuth) {
    return { 
      method: 'presigned', 
      reason: 'HTTPS协议，需要认证，使用预签名URL',
      ttl: policy.presignedUrlTTL
    };
  }
  
  return { method: 'direct', reason: 'HTTPS协议，公开访问，直接访问' };
}

/**
 * 打印访问策略调试信息
 * @param s3Url S3存储URL
 */
export function debugAccessPolicy(s3Url: string): void {
  const policy = getS3AccessPolicy(s3Url);
  const method = getAccessMethod(s3Url);
  
  console.group(`🔍 S3访问策略调试: ${s3Url}`);
  console.log('📋 访问策略:', policy);
  console.log('🎯 选择的访问方式:', method);
  console.groupEnd();
}
