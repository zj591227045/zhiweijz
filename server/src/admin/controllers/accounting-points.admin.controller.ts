import { logger } from '../../utils/logger';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import AccountingPointsService from '../../services/accounting-points.service';

const prisma = new PrismaClient();

export class AccountingPointsAdminController {
  /**
   * 获取所有用户的记账点统计
   */
  async getUsersPointsStats(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20, search = '', sortBy = 'totalBalance', sortOrder = 'desc' } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      // 构建搜索条件
      const baseWhere = {
        isActive: true
      };
      
      const searchWhere = search ? {
        ...baseWhere,
        OR: [
          { email: { contains: search as string, mode: 'insensitive' as const } },
          { name: { contains: search as string, mode: 'insensitive' as const } }
        ]
      } : baseWhere;

      // 获取用户列表及其记账点信息
      const users = await prisma.user.findMany({
        where: searchWhere,
        include: {
          accountingPoints: true
        },
        skip: offset,
        take: Number(limit)
      });

      const total = await prisma.user.count({
        where: searchWhere
      });

      // 处理数据并排序
      const usersWithStats = users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        giftBalance: user.accountingPoints?.giftBalance || 0,
        memberBalance: user.accountingPoints?.memberBalance || 0,
        totalBalance: (user.accountingPoints?.giftBalance || 0) + (user.accountingPoints?.memberBalance || 0),
        createdAt: user.createdAt,
        lastUpdated: user.accountingPoints?.updatedAt || user.createdAt
      }));

      // 排序
      usersWithStats.sort((a, b) => {
        const aVal = a[sortBy as keyof typeof a];
        const bVal = b[sortBy as keyof typeof b];
        
        if (sortOrder === 'desc') {
          return bVal > aVal ? 1 : -1;
        } else {
          return aVal > bVal ? 1 : -1;
        }
      });

      res.json({
        success: true,
        data: {
          users: usersWithStats,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      logger.error('获取用户记账点统计失败:', error);
      res.status(500).json({
        success: false,
        error: '获取用户记账点统计失败'
      });
    }
  }

  /**
   * 获取记账点总体统计
   */
  async getOverallStats(req: Request, res: Response) {
    try {
      // 统计总记账点数量
      const totalStats = await prisma.userAccountingPoints.aggregate({
        _sum: {
          giftBalance: true,
          memberBalance: true
        },
        _count: {
          id: true
        }
      });

      // 统计今日消费 - 使用北京时间0点作为今日开始
      const beijingTodayStart = AccountingPointsService.getBeijingTodayStart();

      const todayConsumption = await prisma.accountingPointsTransactions.aggregate({
        where: {
          operation: 'deduct',
          createdAt: {
            gte: beijingTodayStart
          }
        },
        _sum: {
          points: true
        }
      });

      // 统计今日新增 - 使用北京时间0点作为今日开始
      const todayAddition = await prisma.accountingPointsTransactions.aggregate({
        where: {
          operation: 'add',
          createdAt: {
            gte: beijingTodayStart
          }
        },
        _sum: {
          points: true
        }
      });

      // 统计各类型消费量（最近30天）
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const consumptionByType = await prisma.accountingPointsTransactions.groupBy({
        by: ['type'],
        where: {
          operation: 'deduct',
          createdAt: {
            gte: thirtyDaysAgo
          }
        },
        _sum: {
          points: true
        },
        _count: {
          id: true
        }
      });

      res.json({
        success: true,
        data: {
          totalGiftBalance: totalStats._sum.giftBalance || 0,
          totalMemberBalance: totalStats._sum.memberBalance || 0,
          totalBalance: (totalStats._sum.giftBalance || 0) + (totalStats._sum.memberBalance || 0),
          totalUsers: totalStats._count.id || 0,
          todayConsumption: todayConsumption._sum.points || 0,
          todayAddition: todayAddition._sum.points || 0,
          consumptionByType: consumptionByType.map(item => ({
            type: item.type,
            totalPoints: item._sum.points || 0,
            totalTransactions: item._count.id
          }))
        }
      });
    } catch (error) {
      logger.error('获取记账点总体统计失败:', error);
      res.status(500).json({
        success: false,
        error: '获取记账点总体统计失败'
      });
    }
  }

  /**
   * 获取用户的记账点记账记录
   */
  async getUserTransactions(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const transactions = await prisma.accountingPointsTransactions.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: Number(limit)
      });

      const total = await prisma.accountingPointsTransactions.count({
        where: { userId }
      });

      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      logger.error('获取用户记账记录失败:', error);
      res.status(500).json({
        success: false,
        error: '获取用户记账记录失败'
      });
    }
  }

  /**
   * 管理员手动为用户添加记账点
   */
  async addPointsToUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { points, description = '管理员手动添加' } = req.body;

      if (!points || points <= 0) {
        return res.status(400).json({
          success: false,
          error: '记账点数量必须大于0'
        });
      }

      const newBalance = await AccountingPointsService.adminAddPoints(userId, points, description);

      res.json({
        success: true,
        data: {
          newBalance,
          message: `成功为用户添加 ${points} 记账点`
        }
      });
    } catch (error) {
      logger.error('添加记账点失败:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '添加记账点失败'
      });
    }
  }

  /**
   * 批量为用户添加记账点
   */
  async batchAddPoints(req: Request, res: Response) {
    try {
      const { userIds, points, description = '管理员批量添加' } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: '用户ID列表不能为空'
        });
      }

      if (!points || points <= 0) {
        return res.status(400).json({
          success: false,
          error: '记账点数量必须大于0'
        });
      }

      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (const userId of userIds) {
        try {
          await AccountingPointsService.adminAddPoints(userId, points, description);
          results.push({ userId, success: true });
          successCount++;
        } catch (error) {
          results.push({ userId, success: false, error: error instanceof Error ? error.message : '添加失败' });
          failureCount++;
        }
      }

      res.json({
        success: true,
        data: {
          successCount,
          failureCount,
          results,
          message: `批量添加完成，成功 ${successCount} 个用户，失败 ${failureCount} 个用户`
        }
      });
    } catch (error) {
      logger.error('批量添加记账点失败:', error);
      res.status(500).json({
        success: false,
        error: '批量添加记账点失败'
      });
    }
  }

  /**
   * 获取记账点配置
   */
  async getPointsConfig(req: Request, res: Response) {
    try {
      const registrationGift = await AccountingPointsService.getRegistrationGiftPoints();

      const config = {
        pointCosts: AccountingPointsService.POINT_COSTS,
        checkinReward: AccountingPointsService.CHECKIN_REWARD,
        dailyGift: AccountingPointsService.DAILY_GIFT,
        registrationGift: registrationGift,
        giftBalanceLimit: AccountingPointsService.GIFT_BALANCE_LIMIT
      };

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      logger.error('获取记账点配置失败:', error);
      res.status(500).json({
        success: false,
        error: '获取记账点配置失败'
      });
    }
  }

  /**
   * 更新注册赠送点数配置
   */
  async updateRegistrationGiftPoints(req: Request, res: Response) {
    try {
      const { points } = req.body;

      if (!points || isNaN(parseInt(points)) || parseInt(points) < 0) {
        res.status(400).json({
          success: false,
          error: '请提供有效的点数（非负整数）'
        });
        return;
      }

      // 更新系统配置
      await prisma.systemConfig.upsert({
        where: { key: 'registration_gift_points' },
        update: {
          value: points.toString(),
          updatedAt: new Date()
        },
        create: {
          key: 'registration_gift_points',
          value: points.toString(),
          description: '新用户注册时赠送的记账点数量',
          category: 'accounting_points'
        }
      });

      res.json({
        success: true,
        message: `注册赠送点数已更新为 ${points} 点`,
        data: { registrationGiftPoints: parseInt(points) }
      });
    } catch (error) {
      logger.error('更新注册赠送点数失败:', error);
      res.status(500).json({
        success: false,
        error: '更新注册赠送点数失败'
      });
    }
  }

  /**
   * 获取每日活跃用户统计
   */
  async getDailyActiveStats(req: Request, res: Response) {
    try {
      const date = req.query.date as string;
      const days = parseInt(req.query.days as string) || 7;

      if (date) {
        // 获取特定日期的统计
        const stats = await AccountingPointsService.getDailyActiveUsersStats(date);
        res.json({
          success: true,
          data: stats
        });
      } else {
        // 获取历史统计
        const stats = await AccountingPointsService.getHistoricalDailyActiveStats(days);
        res.json({
          success: true,
          data: stats
        });
      }
    } catch (error) {
      logger.error('获取日活跃统计失败:', error);
      res.status(500).json({
        success: false,
        error: '获取日活跃统计失败'
      });
    }
  }

  /**
   * 获取去重的活跃用户统计
   */
  async getUniqueActiveStats(req: Request, res: Response) {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const stats = await AccountingPointsService.getUniqueActiveUsersStats(days);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('获取去重活跃统计失败:', error);
      res.status(500).json({
        success: false,
        error: '获取去重活跃统计失败'
      });
    }
  }
}