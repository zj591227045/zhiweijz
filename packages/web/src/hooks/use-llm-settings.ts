'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLLMCacheStore } from '../store/llm-cache-store';
import { LLMSettings } from '@zhiweijz/core';

export interface UseLLMSettingsOptions {
  accountBookId?: string;
  // 是否在组件挂载时立即检查
  immediate?: boolean;
  // 是否跳过缓存，强制从服务器获取最新数据
  skipCache?: boolean;
}

export interface UseLLMSettingsReturn {
  llmSettings: LLMSettings | null;
  hasLLMService: boolean | null;
  isLoading: boolean;
  error: string | null;
  // 手动刷新LLM设置
  refresh: () => Promise<void>;
  // 清除当前账本的缓存
  clearCache: () => void;
}

export function useLLMSettings(options: UseLLMSettingsOptions = {}): UseLLMSettingsReturn {
  const { accountBookId, immediate = true, skipCache = false } = options;
  const { getLLMSettings, clearCache: clearStoreCache, llmCache } = useLLMCacheStore();
  
  const [llmSettings, setLLMSettings] = useState<LLMSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLLMSettings = useCallback(async (forceRefresh = false) => {
    if (!accountBookId) {
      setLLMSettings(null);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 如果需要跳过缓存，先清除缓存
      if (forceRefresh || skipCache) {
        clearStoreCache(accountBookId);
      }

      const settings = await getLLMSettings(accountBookId, null);
      setLLMSettings(settings);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取LLM设置失败';
      setError(errorMessage);
      console.error('获取LLM设置失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accountBookId, getLLMSettings, clearStoreCache]);

  const refresh = useCallback(async () => {
    await fetchLLMSettings(true);
  }, [fetchLLMSettings]);

  const clearCache = useCallback(() => {
    if (accountBookId) {
      clearStoreCache(accountBookId);
    }
  }, [accountBookId, clearStoreCache]);

  // 监听缓存变化 - 使用具体的缓存值而不是整个llmCache对象
  useEffect(() => {
    if (accountBookId && llmCache[accountBookId]) {
      setLLMSettings(llmCache[accountBookId]);
    }
  }, [accountBookId, llmCache[accountBookId]]);

  // 初始化时获取LLM设置
  useEffect(() => {
    if (immediate && accountBookId) {
      fetchLLMSettings();
    }
  }, [immediate, accountBookId, fetchLLMSettings]);

  const hasLLMService = llmSettings ? llmSettings.bound : null;

  return {
    llmSettings,
    hasLLMService,
    isLoading,
    error,
    refresh,
    clearCache
  };
} 