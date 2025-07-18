// 版本管理API接口
export interface VersionCheckRequest {
  platform: 'web' | 'ios' | 'android';
  currentVersion?: string;
  currentBuildNumber?: number;
}

export interface VersionCheckResponse {
  hasUpdate: boolean;
  latestVersion?: {
    id: string;
    platform: string;
    version: string;
    buildNumber: number;
    versionCode: number;
    releaseNotes?: string;
    downloadUrl?: string;
    appStoreUrl?: string;
    detailUrl?: string; // 详细更新情况链接
    isForceUpdate: boolean;
    publishedAt: string;
  };
  isForceUpdate: boolean;
  updateMessage?: string;
  userStatus?: {
    id: string;
    userId: string;
    platform: string;
    appVersionId: string;
    version: string;
    versionCode: number;
    status: 'PENDING' | 'POSTPONED' | 'IGNORED' | 'UPDATED';
    postponedUntil?: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface VersionUpdateLogRequest {
  platform: 'web' | 'ios' | 'android';
  currentVersion?: string;
  currentBuildNumber?: number;
  latestVersion?: string;
  latestBuildNumber?: number;
}

export interface UserVersionStatusRequest {
  platform: 'web' | 'ios' | 'android';
  appVersionId: string;
  status: 'postponed' | 'ignored' | 'updated';
  postponedUntil?: Date;
}

// API基础URL配置
const getApiBaseUrl = (): string => {
  // 优先使用环境变量配置的URL
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  // 如果没有配置环境变量，智能检测环境
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // 开发环境 (localhost, 127.0.0.1, 或 .local 域名)
    if (hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.endsWith('.local') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')) {
      return ''; // 使用相对路径
    }

    // 生产环境使用当前域名
    return window.location.origin;
  }

  // 服务端渲染时使用相对路径
  return '';
};

// 版本检查API
export const versionApi = {
  // 检查版本更新
  async checkVersion(data: VersionCheckRequest): Promise<VersionCheckResponse> {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/version/check`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('版本检查失败');
    }

    const result = await response.json();
    return result.data;
  },

  // 获取最新版本信息（公开接口）
  async getLatestVersion(platform: 'web' | 'ios' | 'android') {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/version/latest/${platform}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('获取版本信息失败');
    }

    const result = await response.json();
    return result.data;
  },

  // 记录更新操作
  async logUpdate(data: VersionUpdateLogRequest, token: string) {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/version/log/update`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('记录更新日志失败');
    }

    return await response.json();
  },

  // 记录跳过更新操作
  async logSkip(data: VersionUpdateLogRequest, token: string) {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/version/log/skip`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('记录跳过日志失败');
    }

    return await response.json();
  },

  // 设置用户版本状态
  async setUserVersionStatus(data: UserVersionStatusRequest, token: string) {
    const response = await fetch('/api/version/user/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('设置版本状态失败');
    }

    return await response.json();
  },

  // 获取用户版本状态
  async getUserVersionStatus(platform: 'web' | 'ios' | 'android', appVersionId: string, token: string) {
    const response = await fetch(`/api/version/user/status/${platform}/${appVersionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('获取版本状态失败');
    }

    return await response.json();
  },

  // 获取用户所有版本状态
  async getUserVersionStatuses(platform?: 'web' | 'ios' | 'android', token?: string) {
    const url = platform ? `/api/version/user/statuses?platform=${platform}` : '/api/version/user/statuses';
    const response = await fetch(url, {
      headers: token ? {
        'Authorization': `Bearer ${token}`,
      } : {},
    });

    if (!response.ok) {
      throw new Error('获取版本状态列表失败');
    }

    return await response.json();
  },
};