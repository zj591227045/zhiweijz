import prisma from '../config/database';

/**
 * Token限制检查服务
 * 实现LLM Token使用限制功能
 */
export class TokenLimitService {
  /**
   * 获取用户的每日Token限额
   * 优先级：用户个人限额 -> 全局限额
   */
  async getUserDailyTokenLimit(userId: string): Promise<number> {
    try {
      // 检查功能是否启用
      const isEnabled = await this.isTokenLimitEnabled();
      if (!isEnabled) {
        return Number.MAX_SAFE_INTEGER; // 如果功能未启用，返回无限制
      }

      // 1. 首先查看用户是否有个人限额设置
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { dailyLlmTokenLimit: true },
      });

      if (user?.dailyLlmTokenLimit) {
        return user.dailyLlmTokenLimit;
      }

      // 2. 如果用户没有个人限额，使用全局限额
      const globalLimit = await this.getGlobalDailyTokenLimit();
      return globalLimit;
    } catch (error) {
      console.error('获取用户每日Token限额失败:', error);
      // 出错时返回默认限额
      return 50000;
    }
  }

  /**
   * 获取全局每日Token限额
   */
  async getGlobalDailyTokenLimit(): Promise<number> {
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { key: 'llm_global_daily_token_limit' },
      });

      return config ? parseInt(config.value || '50000') : 50000;
    } catch (error) {
      console.error('获取全局Token限额失败:', error);
      return 50000;
    }
  }

  /**
   * 检查Token限制功能是否启用
   */
  async isTokenLimitEnabled(): Promise<boolean> {
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { key: 'llm_token_limit_enabled' },
      });

      return config ? config.value === 'true' : true;
    } catch (error) {
      console.error('检查Token限制功能状态失败:', error);
      return true; // 默认启用
    }
  }

  /**
   * 检查Token限制是否强制执行
   */
  async isTokenLimitEnforced(): Promise<boolean> {
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { key: 'llm_token_limit_enforcement' },
      });

      return config ? config.value === 'true' : true;
    } catch (error) {
      console.error('检查Token限制强制执行状态失败:', error);
      return true; // 默认强制执行
    }
  }

  /**
   * 获取用户今日已使用的Token数量
   */
  async getTodayUsedTokens(userId: string): Promise<number> {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const result = await prisma.llmCallLog.aggregate({
        where: {
          userId,
          createdAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
          isSuccess: true,
        },
        _sum: {
          totalTokens: true,
        },
      });

      return Number(result._sum.totalTokens) || 0;
    } catch (error) {
      console.error('获取今日已使用Token数量失败:', error);
      return 0;
    }
  }

  /**
   * 检查用户是否可以使用指定数量的Token
   * @param userId 用户ID
   * @param estimatedTokens 预估要使用的Token数量
   * @returns 是否可以使用
   */
  async canUseTokens(
    userId: string,
    estimatedTokens: number = 0,
  ): Promise<{
    canUse: boolean;
    reason?: string;
    usedTokens: number;
    dailyLimit: number;
    remainingTokens: number;
  }> {
    try {
      // 检查功能是否启用并强制执行
      const isEnabled = await this.isTokenLimitEnabled();
      const isEnforced = await this.isTokenLimitEnforced();

      if (!isEnabled || !isEnforced) {
        const dailyLimit = await this.getUserDailyTokenLimit(userId);
        const usedTokens = await this.getTodayUsedTokens(userId);
        return {
          canUse: true,
          usedTokens,
          dailyLimit,
          remainingTokens: Math.max(0, dailyLimit - usedTokens),
        };
      }

      const dailyLimit = await this.getUserDailyTokenLimit(userId);
      const usedTokens = await this.getTodayUsedTokens(userId);
      const remainingTokens = Math.max(0, dailyLimit - usedTokens);

      if (usedTokens + estimatedTokens > dailyLimit) {
        return {
          canUse: false,
          reason: `今日Token使用量已达限额。已使用: ${usedTokens}, 限额: ${dailyLimit}`,
          usedTokens,
          dailyLimit,
          remainingTokens,
        };
      }

      return {
        canUse: true,
        usedTokens,
        dailyLimit,
        remainingTokens,
      };
    } catch (error) {
      console.error('检查Token使用权限失败:', error);
      // 出错时允许使用，但记录错误
      return {
        canUse: true,
        reason: '检查失败，允许使用',
        usedTokens: 0,
        dailyLimit: 50000,
        remainingTokens: 50000,
      };
    }
  }

  /**
   * 设置用户个人Token限额
   */
  async setUserTokenLimit(userId: string, dailyLimit: number | null): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { dailyLlmTokenLimit: dailyLimit },
      });
    } catch (error) {
      console.error('设置用户Token限额失败:', error);
      throw new Error('设置用户Token限额失败');
    }
  }

  /**
   * 设置全局Token限额
   */
  async setGlobalTokenLimit(dailyLimit: number): Promise<void> {
    try {
      await prisma.systemConfig.upsert({
        where: { key: 'llm_global_daily_token_limit' },
        update: {
          value: dailyLimit.toString(),
          updatedAt: new Date(),
        },
        create: {
          key: 'llm_global_daily_token_limit',
          value: dailyLimit.toString(),
          description: '全局每日LLM Token限额',
          category: 'llm_management',
        },
      });
    } catch (error) {
      console.error('设置全局Token限额失败:', error);
      throw new Error('设置全局Token限额失败');
    }
  }

  /**
   * 获取用户Token使用统计
   */
  async getUserTokenStats(userId: string): Promise<{
    todayUsed: number;
    dailyLimit: number;
    remainingTokens: number;
    usagePercentage: number;
    isPersonalLimit: boolean;
  }> {
    try {
      const dailyLimit = await this.getUserDailyTokenLimit(userId);
      const todayUsed = await this.getTodayUsedTokens(userId);
      const remainingTokens = Math.max(0, dailyLimit - todayUsed);
      const usagePercentage = dailyLimit > 0 ? Math.round((todayUsed / dailyLimit) * 100) : 0;

      // 检查是否使用个人限额
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { dailyLlmTokenLimit: true },
      });
      const isPersonalLimit = user?.dailyLlmTokenLimit !== null;

      return {
        todayUsed,
        dailyLimit,
        remainingTokens,
        usagePercentage,
        isPersonalLimit,
      };
    } catch (error) {
      console.error('获取用户Token统计失败:', error);
      throw new Error('获取用户Token统计失败');
    }
  }

  // 别名方法，兼容控制器接口
  async getGlobalLlmTokenLimit(): Promise<number> {
    return this.getGlobalDailyTokenLimit();
  }

  async setGlobalLlmTokenLimit(limit: number): Promise<void> {
    return this.setGlobalTokenLimit(limit);
  }

  /**
   * 设置Token限制功能开关
   */
  async setTokenLimitEnabled(enabled: boolean): Promise<void> {
    try {
      await prisma.systemConfig.upsert({
        where: { key: 'llm_token_limit_enabled' },
        update: {
          value: enabled ? 'true' : 'false',
          updatedAt: new Date(),
        },
        create: {
          key: 'llm_token_limit_enabled',
          value: enabled ? 'true' : 'false',
          description: 'LLM Token限额功能开关',
          category: 'llm_management',
        },
      });
    } catch (error) {
      console.error('设置Token限制功能开关失败:', error);
      throw new Error('设置Token限制功能开关失败');
    }
  }

  /**
   * 获取带Token限额的用户列表
   */
  async getUsersWithTokenLimits(options: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<{
    users: Array<{
      id: string;
      name: string;
      email: string;
      dailyLlmTokenLimit: number | null;
      todayUsed: number;
      remainingTokens: number;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const { page, limit, search } = options;
      const offset = (page - 1) * limit;

      // 构建查询条件
      const whereCondition: any = {};
      if (search) {
        whereCondition.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: whereCondition,
          select: {
            id: true,
            name: true,
            email: true,
            dailyLlmTokenLimit: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.user.count({ where: whereCondition }),
      ]);

      // 获取每个用户的Token使用统计
      const usersWithStats = await Promise.all(
        users.map(async (user) => {
          const todayUsed = await this.getTodayUsedTokens(user.id);
          const dailyLimit = user.dailyLlmTokenLimit || (await this.getGlobalDailyTokenLimit());
          const remainingTokens = Math.max(0, dailyLimit - todayUsed);

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            dailyLlmTokenLimit: user.dailyLlmTokenLimit,
            todayUsed,
            remainingTokens,
          };
        }),
      );

      return {
        users: usersWithStats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('获取用户Token限额列表失败:', error);
      throw new Error('获取用户Token限额列表失败');
    }
  }

  /**
   * 批量设置用户Token限额
   */
  async batchSetUserTokenLimits(userIds: string[], dailyLimit: number): Promise<{ count: number }> {
    try {
      const result = await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { dailyLlmTokenLimit: dailyLimit },
      });

      return { count: result.count };
    } catch (error) {
      console.error('批量设置用户Token限额失败:', error);
      throw new Error('批量设置用户Token限额失败');
    }
  }

  /**
   * 获取Token使用量趋势
   */
  async getTokenUsageTrends(days: number): Promise<{
    trends: Array<{
      date: string;
      totalTokens: number;
      callCount: number;
      uniqueUsers: number;
    }>;
    summary: {
      totalTokens: number;
      totalCalls: number;
      avgTokensPerCall: number;
      peakDay: string;
    };
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      // 获取每日Token使用统计
      const dailyStats = await prisma.$queryRaw<
        Array<{
          date: string;
          total_tokens: bigint;
          call_count: bigint;
          unique_users: bigint;
        }>
      >`
        SELECT 
          DATE(created_at) as date,
          SUM(total_tokens) as total_tokens,
          COUNT(*) as call_count,
          COUNT(DISTINCT user_id) as unique_users
        FROM llm_call_logs 
        WHERE created_at >= ${startDate} 
          AND created_at <= ${endDate}
          AND is_success = true
        GROUP BY DATE(created_at)
        ORDER BY date
      `;

      // 格式化数据
      const trends = dailyStats.map((stat) => ({
        date: stat.date,
        totalTokens: Number(stat.total_tokens),
        callCount: Number(stat.call_count),
        uniqueUsers: Number(stat.unique_users),
      }));

      // 计算汇总信息
      const totalTokens = trends.reduce((sum, day) => sum + day.totalTokens, 0);
      const totalCalls = trends.reduce((sum, day) => sum + day.callCount, 0);
      const avgTokensPerCall = totalCalls > 0 ? Math.round(totalTokens / totalCalls) : 0;
      const peakDay = trends.reduce(
        (peak, day) => (day.totalTokens > peak.totalTokens ? day : peak),
        trends[0] || { date: '', totalTokens: 0 },
      );

      return {
        trends,
        summary: {
          totalTokens,
          totalCalls,
          avgTokensPerCall,
          peakDay: peakDay.date,
        },
      };
    } catch (error) {
      console.error('获取Token使用量趋势失败:', error);
      throw new Error('获取Token使用量趋势失败');
    }
  }
}
