import { logger } from '../../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface MultimodalAICallData {
  userId: string;
  userName: string;
  accountBookId?: string;
  accountBookName?: string;
  aiServiceType: 'speech' | 'vision';
  provider: string;
  model: string;
  source?: 'App' | 'WeChat' | 'API';
  inputSize?: number;
  inputFormat?: string;
  outputText?: string;
  confidenceScore?: number;
  isSuccess: boolean;
  errorMessage?: string;
  duration: number;
  tokens?: number;
  cost?: number;
}

export class MultimodalAILoggingService {
  /**
   * 记录多模态AI调用日志
   */
  static async logMultimodalAICall(data: MultimodalAICallData): Promise<void> {
    try {
      await prisma.multimodalAiCallLog.create({
        data: {
          userId: data.userId,
          userName: data.userName,
          accountBookId: data.accountBookId,
          accountBookName: data.accountBookName,
          aiServiceType: data.aiServiceType,
          provider: data.provider,
          model: data.model,
          source: data.source || 'App',
          inputSize: data.inputSize || 0,
          inputFormat: data.inputFormat,
          outputText: data.outputText,
          confidenceScore: data.confidenceScore ? data.confidenceScore.toString() : null,
          isSuccess: data.isSuccess,
          errorMessage: data.errorMessage,
          duration: data.duration,
          tokens: data.tokens || 0,
          cost: data.cost ? data.cost.toString() : null,
        },
      });
    } catch (error) {
      logger.error('记录多模态AI调用日志失败:', error);
      // 不抛出错误，避免影响主要业务流程
    }
  }

  /**
   * 获取多模态AI调用统计
   */
  static async getMultimodalAICallStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalCalls: number;
    successCalls: number;
    failedCalls: number;
    speechCalls: number;
    visionCalls: number;
    totalCost: number;
    avgDuration: number;
  }> {
    try {
      const where: any = {};
      
      if (startDate && endDate) {
        where.createdAt = {
          gte: startDate,
          lte: endDate,
        };
      }

      const [totalCalls, successCalls, speechCalls, visionCalls, costSum, avgDuration] = await Promise.all([
        prisma.multimodalAiCallLog.count({ where }),
        prisma.multimodalAiCallLog.count({ where: { ...where, isSuccess: true } }),
        prisma.multimodalAiCallLog.count({ where: { ...where, aiServiceType: 'speech' } }),
        prisma.multimodalAiCallLog.count({ where: { ...where, aiServiceType: 'vision' } }),
        prisma.multimodalAiCallLog.aggregate({
          where,
          _sum: { cost: true },
        }),
        prisma.multimodalAiCallLog.aggregate({
          where,
          _avg: { duration: true },
        }),
      ]);

      return {
        totalCalls,
        successCalls,
        failedCalls: totalCalls - successCalls,
        speechCalls,
        visionCalls,
        totalCost: Number(costSum._sum.cost) || 0,
        avgDuration: Math.round(avgDuration._avg.duration || 0),
      };
    } catch (error) {
      logger.error('获取多模态AI调用统计失败:', error);
      return {
        totalCalls: 0,
        successCalls: 0,
        failedCalls: 0,
        speechCalls: 0,
        visionCalls: 0,
        totalCost: 0,
        avgDuration: 0,
      };
    }
  }
}
