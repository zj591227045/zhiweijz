/**
 * 版本检查服务
 * 提供完整的版本检查、更新管理和用户偏好设置功能
 */

import {
  versionApi,
  VersionCheckRequest,
  VersionCheckResponse,
  UserVersionStatusRequest,
} from '@/lib/api/version';

// 版本检查数据结构
export interface VersionCheckData {
  skippedVersions: string[];
  postponedVersion?: string;
  postponedUntil?: string;
  lastCheckTime?: string;
}

// 平台类型
export type Platform = 'web' | 'ios' | 'android';

// 用户操作类型
export type UserAction = 'update' | 'postpone' | 'skip';

// 版本检查结果
export interface VersionCheckResult {
  hasUpdate: boolean;
  shouldShowDialog: boolean;
  updateInfo?: VersionCheckResponse;
  reason?: string;
}

class VersionCheckService {
  private readonly STORAGE_KEY = 'versionCheck';
  private readonly POSTPONE_DURATION = 24 * 60 * 60 * 1000; // 1天（毫秒）

  /**
   * 获取当前平台
   */
  getCurrentPlatform(): Platform {
    if (typeof window === 'undefined') return 'web';

    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('android')) return 'android';
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
    return 'web';
  }

  /**
   * 获取当前应用版本信息
   */
  getCurrentAppVersion(): { version: string; buildNumber: number } {
    // 从环境变量获取版本信息，如果没有则使用默认值
    let version = process.env.NEXT_PUBLIC_APP_VERSION;
    const buildNumber = parseInt(process.env.NEXT_PUBLIC_BUILD_NUMBER || '1', 10);

    // 如果环境变量中没有版本信息，尝试从package.json获取
    if (!version) {
      try {
        // 在客户端环境中，我们无法直接读取package.json
        // 所以使用默认版本号，实际部署时应该通过构建脚本设置环境变量
        version = '1.0.0';
      } catch (error) {
        version = '1.0.0';
      }
    }

    return { version, buildNumber };
  }

  /**
   * 从localStorage获取版本检查数据
   */
  private getVersionCheckData(): VersionCheckData {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) {
        return { skippedVersions: [] };
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to parse version check data:', error);
      return { skippedVersions: [] };
    }
  }

  /**
   * 保存版本检查数据到localStorage
   */
  private saveVersionCheckData(data: VersionCheckData): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save version check data:', error);
    }
  }

  /**
   * 检查版本是否被跳过
   */
  private isVersionSkipped(version: string): boolean {
    const data = this.getVersionCheckData();
    return data.skippedVersions.includes(version);
  }

  /**
   * 检查版本是否被推迟且推迟时间未到
   */
  private isVersionPostponed(version: string): boolean {
    const data = this.getVersionCheckData();

    if (data.postponedVersion !== version || !data.postponedUntil) {
      return false;
    }

    const postponedUntil = new Date(data.postponedUntil);
    const now = new Date();

    return now < postponedUntil;
  }

  /**
   * 比较版本号
   */
  private compareVersions(current: string, latest: string): number {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);

    const maxLength = Math.max(currentParts.length, latestParts.length);

    for (let i = 0; i < maxLength; i++) {
      const currentPart = currentParts[i] || 0;
      const latestPart = latestParts[i] || 0;

      if (currentPart < latestPart) return -1;
      if (currentPart > latestPart) return 1;
    }

    return 0;
  }

  /**
   * 执行版本检查
   */
  async checkVersion(): Promise<VersionCheckResult> {
    try {
      const platform = this.getCurrentPlatform();
      const { version, buildNumber } = this.getCurrentAppVersion();

      const request: VersionCheckRequest = {
        platform,
        currentVersion: version,
        currentBuildNumber: buildNumber,
      };

      const response = await versionApi.checkVersion(request);

      // 更新最后检查时间
      const data = this.getVersionCheckData();
      data.lastCheckTime = new Date().toISOString();
      this.saveVersionCheckData(data);

      // 如果没有更新
      if (!response.hasUpdate || !response.latestVersion) {
        return {
          hasUpdate: false,
          shouldShowDialog: false,
          reason: 'No update available',
        };
      }

      const latestVersion = response.latestVersion.version;

      // 检查是否被跳过
      if (this.isVersionSkipped(latestVersion)) {
        return {
          hasUpdate: true,
          shouldShowDialog: false,
          updateInfo: response,
          reason: 'Version skipped by user',
        };
      }

      // 检查是否被推迟且时间未到
      if (this.isVersionPostponed(latestVersion)) {
        return {
          hasUpdate: true,
          shouldShowDialog: false,
          updateInfo: response,
          reason: 'Version postponed by user',
        };
      }

      // 强制更新或正常更新都应该显示对话框
      return {
        hasUpdate: true,
        shouldShowDialog: true,
        updateInfo: response,
      };
    } catch (error) {
      console.error('Version check failed:', error);
      return {
        hasUpdate: false,
        shouldShowDialog: false,
        reason: 'Check failed',
      };
    }
  }

  /**
   * 处理用户操作
   */
  async handleUserAction(action: UserAction, version: string, versionId?: string): Promise<void> {
    const data = this.getVersionCheckData();

    switch (action) {
      case 'skip':
        // 添加到跳过列表
        if (!data.skippedVersions.includes(version)) {
          data.skippedVersions.push(version);
        }
        // 清除推迟设置
        if (data.postponedVersion === version) {
          delete data.postponedVersion;
          delete data.postponedUntil;
        }
        break;

      case 'postpone':
        // 设置推迟
        data.postponedVersion = version;
        data.postponedUntil = new Date(Date.now() + this.POSTPONE_DURATION).toISOString();
        break;

      case 'update':
        // 清除该版本的所有设置
        data.skippedVersions = data.skippedVersions.filter((v) => v !== version);
        if (data.postponedVersion === version) {
          delete data.postponedVersion;
          delete data.postponedUntil;
        }
        break;
    }

    this.saveVersionCheckData(data);

    // 调用API记录用户操作
    try {
      const token = localStorage.getItem('token');
      if (token && versionId) {
        const platform = this.getCurrentPlatform();

        if (action === 'update') {
          // 记录更新操作
          await versionApi.logUpdate(
            {
              platform,
              currentVersion: this.getCurrentAppVersion().version,
              currentBuildNumber: this.getCurrentAppVersion().buildNumber,
              latestVersion: version,
              latestBuildNumber: 0,
            },
            token,
          );
        } else {
          // 设置用户版本状态
          const statusRequest: UserVersionStatusRequest = {
            platform,
            appVersionId: versionId,
            status: action === 'skip' ? 'ignored' : 'postponed',
            postponedUntil:
              action === 'postpone' ? new Date(Date.now() + this.POSTPONE_DURATION) : undefined,
          };

          await versionApi.setUserVersionStatus(statusRequest, token);
        }
      }
    } catch (error) {
      console.error('Failed to log user action:', error);
      // 不抛出错误，避免影响用户体验
    }
  }

  /**
   * 执行平台特定的更新操作
   */
  async performUpdate(updateInfo: VersionCheckResponse): Promise<void> {
    const platform = this.getCurrentPlatform();
    const { latestVersion } = updateInfo;

    if (!latestVersion) {
      throw new Error('No version information available');
    }

    switch (platform) {
      case 'web':
        // Web平台刷新页面
        window.location.reload();
        break;

      case 'ios':
        // iOS平台打开App Store
        if (latestVersion.appStoreUrl) {
          window.open(latestVersion.appStoreUrl, '_blank');
        } else {
          throw new Error('App Store URL not available');
        }
        break;

      case 'android':
        // Android平台下载APK
        if (latestVersion.downloadUrl) {
          window.open(latestVersion.downloadUrl, '_blank');
        } else {
          throw new Error('Download URL not available');
        }
        break;

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * 清除版本检查数据
   */
  clearVersionCheckData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * 获取版本检查统计信息
   */
  getVersionCheckStats(): {
    skippedVersionsCount: number;
    hasPostponedVersion: boolean;
    lastCheckTime?: string;
  } {
    const data = this.getVersionCheckData();
    return {
      skippedVersionsCount: data.skippedVersions.length,
      hasPostponedVersion: !!data.postponedVersion,
      lastCheckTime: data.lastCheckTime,
    };
  }
}

// 导出单例实例
export const versionCheckService = new VersionCheckService();
