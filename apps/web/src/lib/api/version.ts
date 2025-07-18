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

// 版本检查API
export const versionApi = {
  // 检查版本更新
  async checkVersion(data: VersionCheckRequest): Promise<VersionCheckResponse> {
    const response = await fetch('/api/version/check', {
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
    const response = await fetch(`/api/version/latest/${platform}`);
    
    if (!response.ok) {
      throw new Error('获取版本信息失败');
    }

    const result = await response.json();
    return result.data;
  },

  // 记录更新操作
  async logUpdate(data: VersionUpdateLogRequest, token: string) {
    const response = await fetch('/api/version/log/update', {
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
    const response = await fetch('/api/version/log/skip', {
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