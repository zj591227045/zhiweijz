// 是否为开发环境
const isDev = process.env.NODE_ENV === 'development';

// 检查是否为Docker环境
const isDockerEnvironment = (): boolean => {
  // 检查环境变量
  if (process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'docker') {
    return true;
  }
  
  // 在浏览器环境中检测
  if (typeof window !== 'undefined') {
    // 检查是否设置了Docker环境标记
    const isDocker = (window as any).__DOCKER_ENV__ === true ||
                     process.env.DOCKER_ENV === 'true';
    
    // 检查主机名是否为Docker内部网络
    const hostname = window.location.hostname;
    const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('192.168');
    
    // 只有明确设置了Docker环境变量且不是本地开发环境时才认为是Docker
    return isDocker && !isLocalDev;
  }
  
  return false;
};

// 获取当前API基础URL
export const getApiBaseUrl = (): string => {
  // 在服务端渲染时，返回默认值
  if (typeof window === 'undefined') {
    return '/api';
  }

  try {
    // 如果是Docker环境，直接使用相对路径
    if (isDockerEnvironment()) {
      if (isDev) console.log('🐳 Docker环境，使用相对路径: /api');
      return '/api';
    }

    // 直接从LocalStorage读取服务器配置
    const storedConfig = localStorage.getItem('server-config-storage');
    if (storedConfig) {
      try {
        const parsedConfig = JSON.parse(storedConfig);
        const apiUrl = parsedConfig?.state?.config?.currentUrl || 'https://app.zhiweijz.cn:1443/api';

        if (isDev) {
          console.log('📡 从LocalStorage获取API基础URL:', apiUrl);
        }

        return apiUrl;
      } catch (parseError) {
        console.warn('⚠️ 解析服务器配置失败:', parseError);
      }
    }

    // 回退到默认官方服务器
    const defaultUrl = 'https://app.zhiweijz.cn:1443/api';
    if (isDev) {
      console.log('📡 使用默认API基础URL:', defaultUrl);
    }
    return defaultUrl;
  } catch (error) {
    console.warn('⚠️ 获取服务器配置失败，使用默认值:', error);
    return '/api';
  }
};