import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TokenUsageStats {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageTokensPerCall: number;
  dailyUsage: Array<{
    date: string;
    tokens: number;
    calls: number;
  }>;
}

export interface TodayTokenUsage {
  usedTokens: number;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  dailyLimit: number;
  remainingTokens: number;
  usagePercentage: number;
}

export interface TokenUsageParams {
  startDate?: string;
  endDate?: string;
}

export class TokenUsageService {
  /**
   * 获取用户TOKEN使用量统计
   */
  async getUserTokenUsage(userId: string, params: TokenUsageParams = {}): Promise<TokenUsageStats> {
    try {
      const { startDate, endDate } = params;
      
      // 构建日期过滤条件
      const dateFilter: any = {
        userId,
        isSuccess: true // 只统计成功的调用
      };

      if (startDate) {
        dateFilter.createdAt = {
          ...dateFilter.createdAt,
          gte: new Date(startDate)
        };
      }

      if (endDate) {
        dateFilter.createdAt = {
          ...dateFilter.createdAt,
          lte: new Date(endDate)
        };
      }

      // 获取基础统计
      const [
        totalStats,
        callStats,
        failedCallStats
      ] = await Promise.all([
        // Token统计
        prisma.llmCallLog.aggregate({
          where: dateFilter,
          _sum: {
            totalTokens: true,
            promptTokens: true,
            completionTokens: true
          }
        }),
        
        // 成功调用统计
        prisma.llmCallLog.count({
          where: dateFilter
        }),
        
        // 失败调用统计
        prisma.llmCallLog.count({
          where: {
            ...dateFilter,
            isSuccess: false
          }
        })
      ]);

      // 获取每日使用量
      const dailyUsage = await this.getDailyTokenUsage(userId, params);

      const totalTokens = Number(totalStats._sum.totalTokens) || 0;
      const promptTokens = Number(totalStats._sum.promptTokens) || 0;
      const completionTokens = Number(totalStats._sum.completionTokens) || 0;
      const successfulCalls = callStats;
      const failedCalls = failedCallStats;
      const totalCalls = successfulCalls + failedCalls;

      return {
        totalTokens,
        promptTokens,
        completionTokens,
        totalCalls,
        successfulCalls,
        failedCalls,
        averageTokensPerCall: totalCalls > 0 ? Math.round(totalTokens / totalCalls) : 0,
        dailyUsage
      };
    } catch (error) {
      console.error('获取用户TOKEN使用量错误:', error);
      throw new Error('获取用户TOKEN使用量失败');
    }
  }

  /**
   * 获取今日TOKEN使用量
   */
  async getTodayTokenUsage(userId: string): Promise<TodayTokenUsage> {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // 获取今日统计
      const [
        todayStats,
        successfulCalls,
        failedCalls
      ] = await Promise.all([
        prisma.llmCallLog.aggregate({
          where: {
            userId,
            createdAt: {
              gte: startOfDay,
              lt: endOfDay
            },
            isSuccess: true
          },
          _sum: {
            totalTokens: true
          }
        }),
        
        prisma.llmCallLog.count({
          where: {
            userId,
            createdAt: {
              gte: startOfDay,
              lt: endOfDay
            },
            isSuccess: true
          }
        }),
        
        prisma.llmCallLog.count({
          where: {
            userId,
            createdAt: {
              gte: startOfDay,
              lt: endOfDay
            },
            isSuccess: false
          }
        })
      ]);

      const usedTokens = Number(todayStats._sum.totalTokens) || 0;
      const totalCalls = successfulCalls + failedCalls;
      
      // 使用TokenLimitService获取真实的限额
      const { TokenLimitService } = await import('./token-limit.service');
      const tokenLimitService = new TokenLimitService();
      const dailyLimit = await tokenLimitService.getUserDailyTokenLimit(userId);
      
      const remainingTokens = Math.max(0, dailyLimit - usedTokens);
      const usagePercentage = dailyLimit > 0 ? Math.round((usedTokens / dailyLimit) * 100) : 0;

      return {
        usedTokens,
        totalCalls,
        successfulCalls,
        failedCalls,
        dailyLimit,
        remainingTokens,
        usagePercentage
      };
    } catch (error) {
      console.error('获取今日TOKEN使用量错误:', error);
      throw new Error('获取今日TOKEN使用量失败');
    }
  }

  /**
   * 获取每日TOKEN使用量
   */
  private async getDailyTokenUsage(userId: string, params: TokenUsageParams = {}): Promise<Array<{
    date: string;
    tokens: number;
    calls: number;
  }>> {
    try {
      const { startDate, endDate } = params;
      
      // 默认查询最近30天
      const defaultEndDate = new Date();
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);

      const start = startDate ? new Date(startDate) : defaultStartDate;
      const end = endDate ? new Date(endDate) : defaultEndDate;

      // 使用原生SQL查询每日统计
      const dailyStats = await prisma.$queryRaw<Array<{
        date: string;
        tokens: bigint;
        calls: bigint;
      }>>`
        SELECT 
          DATE(created_at) as date,
          COALESCE(SUM(total_tokens), 0) as tokens,
          COUNT(*) as calls
        FROM llm_call_logs 
        WHERE user_id = ${userId}
          AND created_at >= ${start}
          AND created_at <= ${end}
          AND is_success = true
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;

      return dailyStats.map(stat => ({
        date: stat.date,
        tokens: Number(stat.tokens),
        calls: Number(stat.calls)
      }));
    } catch (error) {
      console.error('获取每日TOKEN使用量错误:', error);
      return [];
    }
  }
}
