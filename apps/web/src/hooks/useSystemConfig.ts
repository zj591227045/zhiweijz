'use client';

import { useSystemFeatures } from './queries/useSystemConfigQueries';
import { createLogger } from '@/lib/logger';

const configLogger = createLogger('SystemConfig');

interface SystemConfig {
  membershipEnabled: boolean;
  accountingPointsEnabled: boolean;
}

export function useSystemConfig() {
  const { 
    data: config, 
    isLoading: loading, 
    error: queryError 
  } = useSystemFeatures();

  // 转换错误格式以保持向后兼容
  const error = queryError ? 
    (queryError instanceof Error ? queryError.message : 'Unknown error') : 
    null;

  // 记录配置获取结果（仅在debug级别）
  if (config && !loading) {
    configLogger.debug('系统配置已加载', config);
  }

  if (error) {
    configLogger.error('系统配置加载失败', error);
  }

  return { 
    config: config || {
      membershipEnabled: false,
      accountingPointsEnabled: false,
    }, 
    loading, 
    error 
  };
}
