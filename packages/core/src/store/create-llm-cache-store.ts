import { create } from "zustand";

export interface LLMSettings {
  bound: boolean;
  id?: string;
  name?: string;
  provider?: string;
  model?: string;
  message?: string;
}

export interface LLMCacheState {
  // 缓存每个账本的LLM设置，key为账本ID
  llmCache: Record<string, LLMSettings>;
  // 缓存的过期时间，key为账本ID，value为过期时间戳
  cacheExpiry: Record<string, number>;
  // 正在请求的账本ID集合，避免重复请求
  pendingRequests: Set<string>;
  
  // 获取账本的LLM设置（带缓存）
  getLLMSettings: (accountBookId: string, apiClient: any) => Promise<LLMSettings>;
  // 清除指定账本的缓存
  clearCache: (accountBookId: string) => void;
  // 清除所有缓存
  clearAllCache: () => void;
  // 手动设置缓存
  setCache: (accountBookId: string, settings: LLMSettings) => void;
}

// 缓存有效期：5分钟
const CACHE_DURATION = 5 * 60 * 1000;

export const createLLMCacheStore = () => {
  return create<LLMCacheState>((set, get) => ({
    llmCache: {},
    cacheExpiry: {},
    pendingRequests: new Set(),

    getLLMSettings: async (accountBookId: string, apiClient: any) => {
      const state = get();
      const now = Date.now();
      
      // 检查缓存是否有效
      const cachedSettings = state.llmCache[accountBookId];
      const cacheExpiry = state.cacheExpiry[accountBookId];
      
      if (cachedSettings && cacheExpiry && now < cacheExpiry) {
        console.log(`使用缓存的LLM设置，账本ID: ${accountBookId}`, cachedSettings);
        return cachedSettings;
      }
      
      // 检查是否已有正在进行的请求
      if (state.pendingRequests.has(accountBookId)) {
        console.log(`账本 ${accountBookId} 的LLM设置请求正在进行中，等待结果`);
        // 等待一段时间后重试获取缓存
        await new Promise(resolve => setTimeout(resolve, 100));
        return get().llmCache[accountBookId] || { bound: false };
      }
      
      try {
        // 标记为正在请求
        set(state => ({
          pendingRequests: new Set([...state.pendingRequests, accountBookId])
        }));
        
        console.log(`发起LLM设置API请求，账本ID: ${accountBookId}`);
        
        const llmSettings = await apiClient.get(`/api/ai/account/${accountBookId}/llm-settings`);
        console.log(`获取到LLM设置并缓存，账本ID: ${accountBookId}`, llmSettings);
        
        // 缓存结果
        set(state => ({
          llmCache: {
            ...state.llmCache,
            [accountBookId]: llmSettings
          },
          cacheExpiry: {
            ...state.cacheExpiry,
            [accountBookId]: now + CACHE_DURATION
          },
          pendingRequests: new Set([...state.pendingRequests].filter(id => id !== accountBookId))
        }));
        
        return llmSettings;
      } catch (error) {
        console.error(`获取账本LLM设置失败:`, error);
        const defaultSettings = { bound: false, message: '网络错误' };
        
        // 移除请求标记
        set(state => ({
          llmCache: {
            ...state.llmCache,
            [accountBookId]: defaultSettings
          },
          cacheExpiry: {
            ...state.cacheExpiry,
            [accountBookId]: now + 30000 // 30秒后重试
          },
          pendingRequests: new Set([...state.pendingRequests].filter(id => id !== accountBookId))
        }));
        
        return defaultSettings;
      }
    },

    clearCache: (accountBookId: string) => {
      set(state => {
        const newCache = { ...state.llmCache };
        const newExpiry = { ...state.cacheExpiry };
        delete newCache[accountBookId];
        delete newExpiry[accountBookId];
        
        return {
          llmCache: newCache,
          cacheExpiry: newExpiry
        };
      });
    },

    clearAllCache: () => {
      set({
        llmCache: {},
        cacheExpiry: {},
        pendingRequests: new Set()
      });
    },

    setCache: (accountBookId: string, settings: LLMSettings) => {
      const now = Date.now();
      set(state => ({
        llmCache: {
          ...state.llmCache,
          [accountBookId]: settings
        },
        cacheExpiry: {
          ...state.cacheExpiry,
          [accountBookId]: now + CACHE_DURATION
        }
      }));
    }
  }));
}; 