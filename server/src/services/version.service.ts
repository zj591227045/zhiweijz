import prisma from '../config/database';
import { 
  AppVersionRequest, 
  AppVersionResponse, 
  CreateVersionRequest, 
  UpdateVersionRequest, 
  VersionCheckRequest, 
  VersionCheckResponse, 
  VersionConfigRequest, 
  VersionConfigResponse, 
  VersionListQuery, 
  VersionStatsResponse,
  UserVersionStatusRequest,
  UserVersionStatusResponse
} from '../models/version.model';
import { AppError } from '../errors/AppError';

export class VersionService {
  // 获取版本配置
  async getVersionConfig(key: string): Promise<VersionConfigResponse | null> {
    const config = await prisma.versionConfig.findUnique({
      where: { key }
    });
    
    return config;
  }

  // 设置版本配置
  async setVersionConfig(data: VersionConfigRequest): Promise<VersionConfigResponse> {
    const config = await prisma.versionConfig.upsert({
      where: { key: data.key },
      update: {
        value: data.value,
        description: data.description,
        updatedAt: new Date()
      },
      create: {
        key: data.key,
        value: data.value,
        description: data.description
      }
    });
    
    return config;
  }

  // 检查版本管理功能是否启用
  async isVersionCheckEnabled(): Promise<boolean> {
    // 首先检查环境变量
    const envEnabled = process.env.ENABLE_VERSION_MANAGEMENT === 'true';
    if (!envEnabled) {
      return false;
    }

    // 然后检查数据库配置，如果没有配置则默认启用
    const config = await this.getVersionConfig('version_check_enabled');
    return config?.value !== 'false'; // 默认启用，除非明确设置为false
  }

  // 获取最新版本
  async getLatestVersion(platform: 'web' | 'ios' | 'android', buildType?: 'debug' | 'release'): Promise<AppVersionResponse | null> {
    // 构建查询条件
    const whereCondition: any = {
      platform: platform.toUpperCase() as any,
      isEnabled: true,
      publishedAt: {
        not: null
      }
    };

    // 如果是调试版本，可以添加特殊的查询条件
    // 例如：查找标记为调试版本的版本，或者使用不同的版本标识
    if (buildType === 'debug') {
      // 可以通过releaseNotes或其他字段来标识调试版本
      // 或者创建专门的调试版本记录
      // 这里暂时使用相同的逻辑，但可以根据需要扩展
      console.log('查询调试版本:', platform, buildType);
    }

    const version = await prisma.appVersion.findFirst({
      where: whereCondition,
      orderBy: {
        versionCode: 'desc'
      }
    });

    return version as AppVersionResponse | null;
  }

  // 版本检查
  async checkVersion(
    data: VersionCheckRequest,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<VersionCheckResponse> {
    // 检查功能是否启用
    if (!(await this.isVersionCheckEnabled())) {
      throw new AppError('版本检查功能未启用', 400);
    }

    const latestVersion = await this.getLatestVersion(data.platform, data.buildType);
    
    if (!latestVersion) {
      // 记录检查日志
      await this.logVersionCheck({
        userId,
        platform: data.platform,
        currentVersion: data.currentVersion,
        currentBuildNumber: data.currentBuildNumber,
        action: 'CHECK',
        ipAddress,
        userAgent
      });

      return {
        hasUpdate: false,
        isForceUpdate: false,
        updateMessage: '暂无可用更新'
      };
    }

    // 比较版本
    const hasUpdate = data.currentBuildNumber ? 
      latestVersion.versionCode > data.currentBuildNumber : true;

    // 获取用户版本状态（如果用户已登录）
    let userStatus: UserVersionStatusResponse | undefined;
    if (userId && hasUpdate) {
      userStatus = (await this.getUserVersionStatus(userId, data.platform, latestVersion.id)) || undefined;
      
      // 如果用户已忽略此版本，则不显示更新提示
      if (userStatus?.status === 'IGNORED') {
        return {
          hasUpdate: false,
          isForceUpdate: false,
          updateMessage: '您已选择忽略此版本的更新',
          userStatus
        };
      }
      
      // 如果用户推迟更新且时间未到，则不显示更新提示
      if (userStatus?.status === 'POSTPONED' && userStatus.postponedUntil) {
        const now = new Date();
        const postponedUntil = new Date(userStatus.postponedUntil);
        if (now < postponedUntil) {
          return {
            hasUpdate: false,
            isForceUpdate: false,
            updateMessage: `更新已推迟至 ${postponedUntil.toLocaleDateString()}`,
            userStatus
          };
        }
      }
    }

    // 记录检查日志
    await this.logVersionCheck({
      userId,
      platform: data.platform,
      currentVersion: data.currentVersion,
      currentBuildNumber: data.currentBuildNumber,
      latestVersion: latestVersion.version,
      latestBuildNumber: latestVersion.buildNumber,
      action: 'CHECK',
      ipAddress,
      userAgent
    });

    return {
      hasUpdate,
      latestVersion: hasUpdate ? latestVersion : undefined,
      isForceUpdate: hasUpdate && latestVersion.isForceUpdate,
      updateMessage: hasUpdate ? 
        `发现新版本 ${latestVersion.version}${latestVersion.releaseNotes ? ': ' + latestVersion.releaseNotes : ''}` : 
        '您已使用最新版本',
      userStatus
    };
  }

  // 创建版本
  async createVersion(data: CreateVersionRequest, createdBy?: string): Promise<AppVersionResponse> {
    console.log('🔍 [版本服务] 创建版本，createdBy:', createdBy, 'type:', typeof createdBy);
    // 检查版本是否已存在
    const existingVersion = await prisma.appVersion.findUnique({
      where: {
        platform_version: {
          platform: data.platform.toUpperCase() as any,
          version: data.version
        }
      }
    });

    if (existingVersion) {
      throw new AppError('该版本已存在', 400);
    }

    // 检查版本码是否已存在
    const existingVersionCode = await prisma.appVersion.findUnique({
      where: {
        platform_versionCode: {
          platform: data.platform.toUpperCase() as any,
          versionCode: data.versionCode
        }
      }
    });

    if (existingVersionCode) {
      throw new AppError('该版本码已存在', 400);
    }

    // 构建数据对象，只有当 createdBy 有值时才包含该字段
    const createData: any = {
      platform: data.platform.toUpperCase() as any,
      version: data.version,
      buildNumber: data.buildNumber,
      versionCode: data.versionCode,
      releaseNotes: data.releaseNotes,
      downloadUrl: data.downloadUrl,
      appStoreUrl: data.appStoreUrl,
      detailUrl: data.detailUrl,
      isForceUpdate: data.isForceUpdate || false,
      isEnabled: data.isEnabled !== false,
      publishedAt: data.publishNow ? new Date() : null,
    };

    // 暂时完全不设置 createdBy 字段，避免外键约束问题
    // if (createdBy) {
    //   createData.createdBy = createdBy;
    // }

    console.log('🔍 [版本服务] 最终创建数据:', JSON.stringify(createData, null, 2));

    const version = await prisma.appVersion.create({
      data: createData
    });

    return version as AppVersionResponse;
  }

  // 更新版本
  async updateVersion(id: string, data: UpdateVersionRequest): Promise<AppVersionResponse> {
    const existingVersion = await prisma.appVersion.findUnique({
      where: { id }
    });

    if (!existingVersion) {
      throw new AppError('版本不存在', 404);
    }

    // 如果更新版本号或版本码，检查是否重复
    if (data.version && data.version !== existingVersion.version) {
      const duplicate = await prisma.appVersion.findFirst({
        where: {
          platform: existingVersion.platform,
          version: data.version,
          id: { not: id }
        }
      });

      if (duplicate) {
        throw new AppError('该版本号已存在', 400);
      }
    }

    if (data.versionCode && data.versionCode !== existingVersion.versionCode) {
      const duplicate = await prisma.appVersion.findFirst({
        where: {
          platform: existingVersion.platform,
          versionCode: data.versionCode,
          id: { not: id }
        }
      });

      if (duplicate) {
        throw new AppError('该版本码已存在', 400);
      }
    }

    const version = await prisma.appVersion.update({
      where: { id },
      data: {
        ...data,
        platform: data.platform ? data.platform.toUpperCase() as any : undefined,
        publishedAt: data.publishNow ? new Date() : 
          (data.publishNow === false ? null : undefined)
      }
    });

    return version as AppVersionResponse;
  }

  // 删除版本
  async deleteVersion(id: string): Promise<void> {
    const version = await prisma.appVersion.findUnique({
      where: { id }
    });

    if (!version) {
      throw new AppError('版本不存在', 404);
    }

    await prisma.appVersion.delete({
      where: { id }
    });
  }

  // 发布版本
  async publishVersion(id: string): Promise<AppVersionResponse> {
    const version = await prisma.appVersion.update({
      where: { id },
      data: {
        publishedAt: new Date(),
        isEnabled: true
      }
    });

    return version as AppVersionResponse;
  }

  // 取消发布版本
  async unpublishVersion(id: string): Promise<AppVersionResponse> {
    const version = await prisma.appVersion.update({
      where: { id },
      data: {
        publishedAt: null,
        isEnabled: false
      }
    });

    return version as AppVersionResponse;
  }

  // 获取版本列表
  async getVersions(query: VersionListQuery): Promise<{
    versions: AppVersionResponse[];
    total: number;
  }> {
    try {
      console.log('🔍 [版本服务] 开始获取版本列表，查询参数:', query);
      
      const where: any = {};

      if (query.platform) {
        where.platform = query.platform.toUpperCase();
      }

      if (query.isEnabled !== undefined) {
        where.isEnabled = query.isEnabled;
      }

      console.log('🔍 [版本服务] 查询条件:', where);

      const [versions, total] = await Promise.all([
        prisma.appVersion.findMany({
          where,
          orderBy: {
            [query.orderBy || 'createdAt']: query.orderDirection || 'desc'
          },
          take: query.limit ? parseInt(query.limit.toString()) : 10,
          skip: query.offset ? parseInt(query.offset.toString()) : 0
        }),
        prisma.appVersion.count({ where })
      ]);

      console.log('🔍 [版本服务] 查询结果:', { versionsCount: versions.length, total });

      return { versions: versions as AppVersionResponse[], total };
    } catch (error) {
      console.error('❌ [版本服务] 获取版本列表失败:', error);
      throw new AppError('获取版本列表失败: ' + (error instanceof Error ? error.message : '未知错误'), 500);
    }
  }

  // 获取版本详情
  async getVersionById(id: string): Promise<AppVersionResponse | null> {
    const version = await prisma.appVersion.findUnique({
      where: { id }
    });

    return version as AppVersionResponse | null;
  }

  // 获取版本统计
  async getVersionStats(): Promise<VersionStatsResponse> {
    const [totalVersions, platformStats] = await Promise.all([
      prisma.appVersion.count(),
      prisma.appVersion.groupBy({
        by: ['platform'],
        _count: {
          id: true
        }
      })
    ]);

    // 获取最新版本
    const latestVersions: Record<string, AppVersionResponse> = {};
    for (const platform of ['WEB', 'IOS', 'ANDROID']) {
      const latest = await this.getLatestVersion(platform.toLowerCase() as any);
      if (latest) {
        latestVersions[platform] = latest;
      }
    }

    return {
      totalVersions,
      platformStats: platformStats.reduce((acc, stat) => {
        acc[stat.platform] = stat._count.id;
        return acc;
      }, {} as Record<string, number>),
      latestVersions
    };
  }

  // 记录版本检查日志
  private async logVersionCheck(data: {
    userId?: string;
    platform: string;
    currentVersion?: string;
    currentBuildNumber?: number;
    latestVersion?: string;
    latestBuildNumber?: number;
    action: 'CHECK' | 'UPDATE' | 'SKIP';
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await prisma.versionCheckLog.create({
      data: {
        userId: data.userId,
        platform: data.platform.toUpperCase() as any,
        currentVersion: data.currentVersion,
        currentBuildNumber: data.currentBuildNumber,
        latestVersion: data.latestVersion,
        latestBuildNumber: data.latestBuildNumber,
        action: data.action,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent
      }
    });
  }

  // 记录更新操作
  async logVersionUpdate(
    userId: string,
    platform: string,
    currentVersion?: string,
    currentBuildNumber?: number,
    latestVersion?: string,
    latestBuildNumber?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logVersionCheck({
      userId,
      platform,
      currentVersion,
      currentBuildNumber,
      latestVersion,
      latestBuildNumber,
      action: 'UPDATE',
      ipAddress,
      userAgent
    });
  }

  // 记录跳过更新操作
  async logVersionSkip(
    userId: string,
    platform: string,
    currentVersion?: string,
    currentBuildNumber?: number,
    latestVersion?: string,
    latestBuildNumber?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logVersionCheck({
      userId,
      platform,
      currentVersion,
      currentBuildNumber,
      latestVersion,
      latestBuildNumber,
      action: 'SKIP',
      ipAddress,
      userAgent
    });
  }

  // 获取用户版本状态
  async getUserVersionStatus(
    userId: string,
    platform: 'web' | 'ios' | 'android',
    appVersionId: string
  ): Promise<UserVersionStatusResponse | null> {
    const status = await prisma.userVersionStatus.findUnique({
      where: {
        userId_platform_appVersionId: {
          userId,
          platform: platform.toUpperCase() as any,
          appVersionId
        }
      }
    });

    return status as UserVersionStatusResponse | null;
  }

  // 设置用户版本状态
  async setUserVersionStatus(
    userId: string,
    data: UserVersionStatusRequest
  ): Promise<UserVersionStatusResponse> {
    // 获取版本信息
    const version = await prisma.appVersion.findUnique({
      where: { id: data.appVersionId }
    });

    if (!version) {
      throw new AppError('版本不存在', 404);
    }

    // 计算推迟时间
    let postponedUntil: Date | null = null;
    if (data.status === 'postponed') {
      postponedUntil = data.postponedUntil || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 默认推迟7天
    }

    const status = await prisma.userVersionStatus.upsert({
      where: {
        userId_platform_appVersionId: {
          userId,
          platform: data.platform.toUpperCase() as any,
          appVersionId: data.appVersionId
        }
      },
      update: {
        status: data.status.toUpperCase() as any,
        postponedUntil,
        updatedAt: new Date()
      },
      create: {
        userId,
        platform: data.platform.toUpperCase() as any,
        appVersionId: data.appVersionId,
        version: version.version,
        versionCode: version.versionCode,
        status: data.status.toUpperCase() as any,
        postponedUntil
      }
    });

    return status as UserVersionStatusResponse;
  }

  // 获取用户所有版本状态
  async getUserVersionStatuses(
    userId: string,
    platform?: 'web' | 'ios' | 'android'
  ): Promise<UserVersionStatusResponse[]> {
    const where: any = { userId };
    
    if (platform) {
      where.platform = platform.toUpperCase();
    }

    const statuses = await prisma.userVersionStatus.findMany({
      where,
      include: {
        appVersion: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return statuses as UserVersionStatusResponse[];
  }

  // 清理过期的版本状态
  async cleanupExpiredVersionStatuses(): Promise<void> {
    const now = new Date();
    
    // 删除已过期的推迟状态
    await prisma.userVersionStatus.deleteMany({
      where: {
        status: 'POSTPONED',
        postponedUntil: {
          lt: now
        }
      }
    });
    
    // 删除超过90天的状态记录
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    await prisma.userVersionStatus.deleteMany({
      where: {
        createdAt: {
          lt: ninetyDaysAgo
        }
      }
    });
  }
}

export const versionService = new VersionService();