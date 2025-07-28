import { useServerConfigStore } from '@/store/server-config-store';

// 是否为开发环境
const isDev = process.env.NODE_ENV === 'development';

// 获取当前API基础URL
export const getApiBaseUrl = (): string => {
  // 在服务端渲染时，返回默认值
  if (typeof window === 'undefined') {
    return '/api';
  }

  try {
    // 使用服务器配置存储的方法
    const store = useServerConfigStore.getState();
    const apiUrl = store.getCurrentApiUrl();

    if (isDev) {
      console.log('📡 从服务器配置存储获取API基础URL:', apiUrl);
    }

    return apiUrl;
  } catch (error) {
    console.warn('⚠️ 获取服务器配置失败，使用默认值:', error);

    // 回退逻辑：直接从LocalStorage读取
    try {
      const storedConfig = localStorage.getItem('server-config-storage');
      if (storedConfig) {
        const parsedConfig = JSON.parse(storedConfig);
        const apiUrl = parsedConfig?.state?.config?.currentUrl || 'https://app.zhiweijz.cn:1443/api';

        if (isDev) {
          console.log('📡 回退：从LocalStorage获取API基础URL:', apiUrl);
        }

        return apiUrl;
      }
    } catch (fallbackError) {
      console.warn('⚠️ 回退方案也失败了:', fallbackError);
    }

    // 最终回退到默认官方服务器
    return 'https://app.zhiweijz.cn:1443/api';
  }
};
