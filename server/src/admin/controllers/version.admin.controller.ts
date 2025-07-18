import { Request, Response } from 'express';
import { versionService } from '../../services/version.service';
import prisma from '../../config/database';
import { 
  CreateVersionRequest, 
  UpdateVersionRequest, 
  VersionConfigRequest, 
  VersionListQuery 
} from '../../models/version.model';

// 扩展Request接口以包含admin属性
interface AdminRequest extends Request {
  admin?: {
    id: string;
    username: string;
    role: string;
  };
}

export class VersionAdminController {
  // 获取版本列表
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
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取版本列表失败'
      });
    }
  }

  // 创建版本
  async createVersion(req: AdminRequest, res: Response): Promise<void> {
    try {
      const data = req.body as CreateVersionRequest;
      const createdBy = req.admin?.id;

      const version = await versionService.createVersion(data, createdBy);

      res.status(201).json({
        success: true,
        data: version,
        message: '版本创建成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '创建版本失败'
      });
    }
  }

  // 获取版本详情
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
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取版本详情失败'
      });
    }
  }

  // 更新版本
  async updateVersion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body as UpdateVersionRequest;

      const version = await versionService.updateVersion(id, data);

      res.json({
        success: true,
        data: version,
        message: '版本更新成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '更新版本失败'
      });
    }
  }

  // 删除版本
  async deleteVersion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await versionService.deleteVersion(id);

      res.json({
        success: true,
        message: '版本删除成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '删除版本失败'
      });
    }
  }

  // 发布版本
  async publishVersion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const version = await versionService.publishVersion(id);

      res.json({
        success: true,
        data: version,
        message: '版本发布成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '发布版本失败'
      });
    }
  }

  // 取消发布版本
  async unpublishVersion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const version = await versionService.unpublishVersion(id);

      res.json({
        success: true,
        data: version,
        message: '版本已下线'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '下线版本失败'
      });
    }
  }

  // 获取版本统计
  async getVersionStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await versionService.getVersionStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取版本统计失败'
      });
    }
  }

  // 获取所有版本配置
  async getVersionConfigs(req: Request, res: Response): Promise<void> {
    try {
      const configs = await prisma.versionConfig.findMany({
        orderBy: { key: 'asc' }
      });

      res.json({
        success: true,
        data: configs
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取版本配置失败'
      });
    }
  }

  // 获取单个版本配置
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
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取版本配置失败'
      });
    }
  }

  // 设置版本配置
  async setVersionConfig(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as VersionConfigRequest;
      const config = await versionService.setVersionConfig(data);

      res.json({
        success: true,
        data: config,
        message: '配置更新成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '更新配置失败'
      });
    }
  }

  // 获取版本检查日志
  async getVersionLogs(req: Request, res: Response): Promise<void> {
    try {
      const { 
        platform, 
        action, 
        limit = 50, 
        offset = 0,
        startDate,
        endDate
      } = req.query;

      const where: any = {};

      if (platform) {
        where.platform = (platform as string).toUpperCase();
      }

      if (action) {
        where.action = action as string;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate as string);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate as string);
        }
      }

      const [logs, total] = await Promise.all([
        prisma.versionCheckLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: Number(limit),
          skip: Number(offset)
        }),
        prisma.versionCheckLog.count({ where })
      ]);

      res.json({
        success: true,
        data: logs,
        total,
        limit: Number(limit),
        offset: Number(offset)
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取版本日志失败'
      });
    }
  }

  // 获取版本日志统计
  async getVersionLogStats(req: Request, res: Response): Promise<void> {
    try {
      const { 
        days = 7 
      } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days));

      // 按平台统计
      const platformStats = await prisma.versionCheckLog.groupBy({
        by: ['platform'],
        where: {
          createdAt: {
            gte: startDate
          }
        },
        _count: {
          id: true
        }
      });

      // 按操作统计
      const actionStats = await prisma.versionCheckLog.groupBy({
        by: ['action'],
        where: {
          createdAt: {
            gte: startDate
          }
        },
        _count: {
          id: true
        }
      });

      // 按日期统计
      const dailyStats = await prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          platform,
          action,
          COUNT(*) as count
        FROM version_check_logs
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at), platform, action
        ORDER BY date DESC
      `;

      // 总检查次数
      const totalChecks = await prisma.versionCheckLog.count({
        where: {
          createdAt: {
            gte: startDate
          }
        }
      });

      // 有更新的检查次数
      const updatedChecks = await prisma.versionCheckLog.count({
        where: {
          createdAt: {
            gte: startDate
          },
          action: 'UPDATE'
        }
      });

      res.json({
        success: true,
        data: {
          platformStats: platformStats.reduce((acc, stat) => {
            acc[stat.platform] = stat._count.id;
            return acc;
          }, {} as Record<string, number>),
          actionStats: actionStats.reduce((acc, stat) => {
            acc[stat.action] = stat._count.id;
            return acc;
          }, {} as Record<string, number>),
          dailyStats,
          totalChecks,
          updatedChecks,
          updateRate: totalChecks > 0 ? (updatedChecks / totalChecks * 100).toFixed(2) : '0'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取版本统计失败'
      });
    }
  }
}