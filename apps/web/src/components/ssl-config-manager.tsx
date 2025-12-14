'use client';

import React, { useState, useEffect } from 'react';
import { sslConfigService } from '@/lib/ssl-config';
import { setSSLPermissive, isSSLPermissive } from '@/lib/ssl-state';

/**
 * 移动端风格的SSL配置组件
 * 仅在自定义服务器时显示
 */
interface SSLConfigManagerProps {
  showForCustomServer?: boolean;
}

export function SSLConfigManager({ showForCustomServer = false }: SSLConfigManagerProps) {
  const [allowInsecure, setAllowInsecure] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 获取SSL状态
  const fetchSSLStatus = async () => {
    try {
      // 使用简化的状态管理
      const currentState = isSSLPermissive();
      setAllowInsecure(currentState);
      console.log('🔍 [SSLConfig] 当前状态:', currentState);
    } catch (error) {
      console.error('获取SSL状态失败:', error);
    }
  };

  // 切换SSL配置
  const handleToggleSSL = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    const newValue = !allowInsecure;
    
    try {
      console.log('🔄 [SSLConfig] 切换SSL配置:', newValue);
      
      // 更新本地状态
      setSSLPermissive(newValue);
      setAllowInsecure(newValue);
      
      // 尝试更新原生插件状态（如果可用）
      if (sslConfigService.isNativePlatform()) {
        try {
          if (newValue) {
            await sslConfigService.configurePermissiveSSL();
          } else {
            await sslConfigService.restoreDefaultSSL();
          }
        } catch (pluginError) {
          console.warn('⚠️ [SSLConfig] 插件配置失败，使用本地状态:', pluginError);
        }
      }
    } catch (error) {
      console.error('SSL配置失败:', error);
      // 回滚状态
      setAllowInsecure(!newValue);
      setSSLPermissive(!newValue);
    } finally {
      setIsLoading(false);
    }
  };

  // 初始化
  useEffect(() => {
    console.log('🔍 [SSLConfig] 初始化检查:', {
      showForCustomServer,
      isNative: sslConfigService.isNativePlatform(),
      platform: sslConfigService.getPlatform()
    });
    
    if (sslConfigService.isNativePlatform()) {
      fetchSSLStatus();
    }
  }, [showForCustomServer]);

  // 只在自定义服务器且为原生平台时显示
  if (!showForCustomServer || !sslConfigService.isNativePlatform()) {
    console.log('🚫 [SSLConfig] 不显示SSL配置:', {
      showForCustomServer,
      isNative: sslConfigService.isNativePlatform()
    });
    return null;
  }

  return (
    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800 mt-4">
      {/* 标题区域 */}
      <div className="flex items-center space-x-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-800 flex items-center justify-center">
          <svg className="w-3 h-3 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h4 className="font-medium text-orange-800 dark:text-orange-200">
          网络安全设置
        </h4>
      </div>

      {/* 说明文字 */}
      <p className="text-sm text-orange-700 dark:text-orange-300 mb-4">
        自定义服务器可能使用HTTP协议或自签名证书
      </p>

      {/* 移动端风格的开关 */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-sm font-medium text-orange-800 dark:text-orange-200">
            允许HTTP连接和不受信任的HTTPS证书
          </div>
        </div>
        
        {/* iOS风格开关 */}
        <button
          onClick={handleToggleSSL}
          disabled={isLoading}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
            ${allowInsecure 
              ? 'bg-orange-500' 
              : 'bg-gray-300 dark:bg-gray-600'
            }
            ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out
              ${allowInsecure ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>
    </div>
  );
}