'use client';

import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../lib/server-config';

interface SystemConfig {
  membershipEnabled: boolean;
  accountingPointsEnabled: boolean;
}

export function useSystemConfig() {
  const [config, setConfig] = useState<SystemConfig>({
    membershipEnabled: false,
    accountingPointsEnabled: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        // 使用动态API配置
        const apiBaseUrl = getApiBaseUrl();
        const url = `${apiBaseUrl}/system/features`;

        console.log('🔍 [SystemConfig] 获取系统配置，URL:', url);

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch system config: ${response.status}`);
        }
        const data = await response.json();

        console.log('✅ [SystemConfig] 系统配置获取成功:', data);
        setConfig(data);
      } catch (err) {
        console.error('❌ [SystemConfig] 获取系统配置失败:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');

        // 如果获取失败，设置默认值（启用所有功能）
        setConfig({
          membershipEnabled: true,
          accountingPointsEnabled: true
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, loading, error };
}