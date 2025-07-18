import { Request, Response } from 'express';
import { versionService } from '../services/version.service';
import { AppError } from '../errors/AppError';
import { 
  CreateVersionRequest, 
  UpdateVersionRequest, 
  VersionCheckRequest, 
  VersionConfigRequest, 
  VersionListQuery,
  UserVersionStatusRequest
} from '../models/version.model';

export class VersionController {
  // 检查版本更新
  async checkVersion(req: Request, res: Response): Promise<void> {
    try {
      // 检查API是否启用
      const apiEnabled = process.env.VERSION_CHECK_API_ENABLED !== 'false';
      if (!apiEnabled) {
        res.status(403).json({
          success: false,
          message: '版本检查API未启用'
        });
        return;
      }

      const { platform, currentVersion, currentBuildNumber } = req.body as VersionCheckRequest;
      
      if (!platform || !['web', 'ios', 'android'].includes(platform)) {
        throw new AppError('平台参数无效', 400);
      }

      const userId = req.user?.id;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      const result = await versionService.checkVersion(
        { platform, currentVersion, currentBuildNumber },
        userId,
        ipAddress,
        userAgent
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器错误'
        });
      }
    }
  }

  // 获取最新版本（公开接口）
  async getLatestVersion(req: Request, res: Response): Promise<void> {
    try {
      const { platform } = req.params;
      
      if (!platform || !['web', 'ios', 'android'].includes(platform)) {
        throw new AppError('平台参数无效', 400);
      }

      const version = await versionService.getLatestVersion(platform as any);
      
      if (!version) {
        res.status(404).json({
          success: false,
          message: '未找到该平台的版本信息'
        });
        return;
      }

      res.json({
        success: true,
        data: version
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器错误'
        });
      }
    }
  }

  // 记录更新操作
  async logUpdate(req: Request, res: Response): Promise<void> {
    try {
      const { 
        platform, 
        currentVersion, 
        currentBuildNumber, 
        latestVersion, 
        latestBuildNumber 
      } = req.body;
      
      if (!platform || !['web', 'ios', 'android'].includes(platform)) {
        throw new AppError('平台参数无效', 400);
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('用户未登录', 401);
      }

      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      await versionService.logVersionUpdate(
        userId,
        platform,
        currentVersion,
        currentBuildNumber,
        latestVersion,
        latestBuildNumber,
        ipAddress,
        userAgent
      );

      res.json({
        success: true,
        message: '更新记录已保存'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器错误'
        });
      }
    }
  }

  // 记录跳过更新操作
  async logSkip(req: Request, res: Response): Promise<void> {
    try {
      const { 
        platform, 
        currentVersion, 
        currentBuildNumber, 
        latestVersion, 
        latestBuildNumber 
      } = req.body;
      
      if (!platform || !['web', 'ios', 'android'].includes(platform)) {
        throw new AppError('平台参数无效', 400);
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('用户未登录', 401);
      }

      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      await versionService.logVersionSkip(
        userId,
        platform,
        currentVersion,
        currentBuildNumber,
        latestVersion,
        latestBuildNumber,
        ipAddress,
        userAgent
      );

      res.json({
        success: true,
        message: '跳过记录已保存'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器错误'
        });
      }
    }
  }

  // 管理员接口：创建版本
  async createVersion(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as CreateVersionRequest;
      const createdBy = req.user?.id;

      const version = await versionService.createVersion(data, createdBy);

      res.status(201).json({
        success: true,
        data: version
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器错误'
        });
      }
    }
  }

  // 管理员接口：更新版本
  async updateVersion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body as UpdateVersionRequest;

      const version = await versionService.updateVersion(id, data);

      res.json({
        success: true,
        data: version
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器错误'
        });
      }
    }
  }

  // 管理员接口：删除版本
  async deleteVersion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await versionService.deleteVersion(id);

      res.json({
        success: true,
        message: '版本已删除'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器错误'
        });
      }
    }
  }

  // 管理员接口：发布版本
  async publishVersion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const version = await versionService.publishVersion(id);

      res.json({
        success: true,
        data: version
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器错误'
        });
      }
    }
  }

  // 管理员接口：取消发布版本
  async unpublishVersion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const version = await versionService.unpublishVersion(id);

      res.json({
        success: true,
        data: version
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器错误'
        });
      }
    }
  }

  // 管理员接口：获取版本列表
  async getVersions(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query as any as VersionListQuery;
      
      const result = await versionService.getVersions(query);

      res.json({
        success: true,
        data: result.versions,
        total: result.total,
        limit: query.limit || 10,
        offset: query.offset || 0
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器错误'
        });
      }
    }
  }

  // 管理员接口：获取版本详情
  async getVersionById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const version = await versionService.getVersionById(id);

      if (!version) {
        res.status(404).json({
          success: false,
          message: '版本不存在'
        });
        return;
      }

      res.json({
        success: true,
        data: version
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器错误'
        });
      }
    }
  }

  // 管理员接口：获取版本统计
  async getVersionStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await versionService.getVersionStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器错误'
        });
      }
    }
  }

  // 管理员接口：获取版本配置
  async getVersionConfig(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;

      const config = await versionService.getVersionConfig(key);

      if (!config) {
        res.status(404).json({
          success: false,
          message: '配置不存在'
        });
        return;
      }

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器错误'
        });
      }
    }
  }

  // 管理员接口：设置版本配置
  async setVersionConfig(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as VersionConfigRequest;

      const config = await versionService.setVersionConfig(data);

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器错误'
        });
      }
    }
  }

  // 用户接口：设置版本状态
  async setUserVersionStatus(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as UserVersionStatusRequest;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('用户未登录', 401);
      }

      if (!data.platform || !['web', 'ios', 'android'].includes(data.platform)) {
        throw new AppError('平台参数无效', 400);
      }

      if (!data.appVersionId) {
        throw new AppError('版本ID不能为空', 400);
      }

      if (!data.status || !['postponed', 'ignored', 'updated'].includes(data.status)) {
        throw new AppError('状态参数无效', 400);
      }

      const status = await versionService.setUserVersionStatus(userId, data);

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器错误'
        });
      }
    }
  }

  // 用户接口：获取用户版本状态
  async getUserVersionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { platform, appVersionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('用户未登录', 401);
      }

      if (!platform || !['web', 'ios', 'android'].includes(platform)) {
        throw new AppError('平台参数无效', 400);
      }

      if (!appVersionId) {
        throw new AppError('版本ID不能为空', 400);
      }

      const status = await versionService.getUserVersionStatus(userId, platform as any, appVersionId);

      if (!status) {
        res.status(404).json({
          success: false,
          message: '版本状态不存在'
        });
        return;
      }

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器错误'
        });
      }
    }
  }

  // 用户接口：获取用户所有版本状态
  async getUserVersionStatuses(req: Request, res: Response): Promise<void> {
    try {
      const { platform } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('用户未登录', 401);
      }

      if (platform && !['web', 'ios', 'android'].includes(platform as string)) {
        throw new AppError('平台参数无效', 400);
      }

      const statuses = await versionService.getUserVersionStatuses(userId, platform as any);

      res.json({
        success: true,
        data: statuses
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器错误'
        });
      }
    }
  }
}

export const versionController = new VersionController();