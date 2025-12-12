import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CompressionStatsEntry {
  id: string;
  userId: string;
  strategy: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  originalFormat: string;
  compressedFormat: string;
  processingTime: number;
  createdAt: Date;
}

export interface CompressionStatsAggregated {
  totalFiles: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  totalSpaceSaved: number;
  averageCompressionRatio: number;
  averageProcessingTime: number;
  byStrategy: Record<string, {
    count: number;
    originalSize: number;
    compressedSize: number;
    spaceSaved: number;
    averageRatio: number;
  }>;
  byFormat: Record<string, {
    count: number;
    originalSize: number;
    compressedSize: number;
    spaceSaved: number;
  }>;
}

export class CompressionStatsService {
  private static instance: CompressionStatsService;

  private constructor() {}

  public static getInstance(): CompressionStatsService {
    if (!CompressionStatsService.instance) {
      CompressionStatsService.instance = new CompressionStatsService();
    }
    return CompressionStatsService.instance;
  }

  /**
   * 记录压缩统计
   */
  async recordCompressionStats(data: {
    userId: string;
    strategy: string;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    originalFormat: string;
    compressedFormat: string;
    processingTime: number;
  }): Promise<void> {
    try {
      // 检查是否启用统计功能
      const statsEnabled = await this.isStatsEnabled();
      if (!statsEnabled) {
        return;
      }

      await prisma.compressionStats.create({
        data: {
          userId: data.userId,
          strategy: data.strategy,
          originalSize: data.originalSize,
          compressedSize: data.compressedSize,
          compressionRatio: data.compressionRatio,
          originalFormat: data.originalFormat,
          compressedFormat: data.compressedFormat,
          processingTime: data.processingTime,
        },
      });

      logger.info(`压缩统计已记录: ${data.strategy}, 原始: ${data.originalSize}B, 压缩后: ${data.compressedSize}B, 比率: ${data.compressionRatio.toFixed(2)}`);
    } catch (error) {
      logger.error('记录压缩统计失败:', error);
      // 统计记录失败不应该影响主流程
    }
  }

  /**
   * 获取压缩统计（按时间范围）
   */
  async getCompressionStats(
    userId?: string,
    days: number = 7
  ): Promise<CompressionStatsAggregated> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const whereClause: any = {
        createdAt: {
          gte: startDate,
        },
      };

      if (userId) {
        whereClause.userId = userId;
      }

      const stats = await prisma.compressionStats.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc',
        },
      });

      return this.aggregateStats(stats);
    } catch (error) {
      logger.error('获取压缩统计失败:', error);
      return this.getEmptyStats();
    }
  }

  /**
   * 获取用户压缩统计
   */
  async getUserCompressionStats(
    userId: string,
    days: number = 30
  ): Promise<CompressionStatsAggregated> {
    return this.getCompressionStats(userId, days);
  }

  /**
   * 获取全局压缩统计
   */
  async getGlobalCompressionStats(days: number = 7): Promise<CompressionStatsAggregated> {
    return this.getCompressionStats(undefined, days);
  }

  /**
   * 清理过期统计数据
   */
  async cleanupExpiredStats(): Promise<number> {
    try {
      const retentionDays = await this.getRetentionDays();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await prisma.compressionStats.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      logger.info(`清理了 ${result.count} 条过期压缩统计记录`);
      return result.count;
    } catch (error) {
      logger.error('清理过期统计数据失败:', error);
      return 0;
    }
  }

  /**
   * 获取压缩效果最好的策略
   */
  async getBestCompressionStrategy(days: number = 7): Promise<{
    strategy: string;
    averageRatio: number;
    count: number;
    spaceSaved: number;
  } | null> {
    try {
      const stats = await this.getGlobalCompressionStats(days);
      
      let bestStrategy: string | null = null;
      let bestRatio = 0;
      let bestCount = 0;
      let bestSpaceSaved = 0;

      for (const [strategy, data] of Object.entries(stats.byStrategy)) {
        if (data.averageRatio > bestRatio && data.count >= 10) { // 至少10个样本
          bestStrategy = strategy;
          bestRatio = data.averageRatio;
          bestCount = data.count;
          bestSpaceSaved = data.spaceSaved;
        }
      }

      return bestStrategy ? {
        strategy: bestStrategy,
        averageRatio: bestRatio,
        count: bestCount,
        spaceSaved: bestSpaceSaved,
      } : null;
    } catch (error) {
      logger.error('获取最佳压缩策略失败:', error);
      return null;
    }
  }

  /**
   * 聚合统计数据
   */
  private aggregateStats(stats: any[]): CompressionStatsAggregated {
    if (stats.length === 0) {
      return this.getEmptyStats();
    }

    const totalFiles = stats.length;
    const totalOriginalSize = stats.reduce((sum, s) => sum + s.originalSize, 0);
    const totalCompressedSize = stats.reduce((sum, s) => sum + s.compressedSize, 0);
    const totalSpaceSaved = totalOriginalSize - totalCompressedSize;
    const averageCompressionRatio = stats.reduce((sum, s) => sum + s.compressionRatio, 0) / totalFiles;
    const averageProcessingTime = stats.reduce((sum, s) => sum + s.processingTime, 0) / totalFiles;

    // 按策略聚合
    const byStrategy: Record<string, any> = {};
    const byFormat: Record<string, any> = {};

    for (const stat of stats) {
      // 按策略
      if (!byStrategy[stat.strategy]) {
        byStrategy[stat.strategy] = {
          count: 0,
          originalSize: 0,
          compressedSize: 0,
          spaceSaved: 0,
          ratios: [],
        };
      }
      byStrategy[stat.strategy].count++;
      byStrategy[stat.strategy].originalSize += stat.originalSize;
      byStrategy[stat.strategy].compressedSize += stat.compressedSize;
      byStrategy[stat.strategy].spaceSaved += (stat.originalSize - stat.compressedSize);
      byStrategy[stat.strategy].ratios.push(stat.compressionRatio);

      // 按格式
      const formatKey = `${stat.originalFormat} → ${stat.compressedFormat}`;
      if (!byFormat[formatKey]) {
        byFormat[formatKey] = {
          count: 0,
          originalSize: 0,
          compressedSize: 0,
          spaceSaved: 0,
        };
      }
      byFormat[formatKey].count++;
      byFormat[formatKey].originalSize += stat.originalSize;
      byFormat[formatKey].compressedSize += stat.compressedSize;
      byFormat[formatKey].spaceSaved += (stat.originalSize - stat.compressedSize);
    }

    // 计算平均比率
    for (const strategy in byStrategy) {
      const ratios = byStrategy[strategy].ratios;
      byStrategy[strategy].averageRatio = ratios.reduce((sum: number, r: number) => sum + r, 0) / ratios.length;
      delete byStrategy[strategy].ratios;
    }

    return {
      totalFiles,
      totalOriginalSize,
      totalCompressedSize,
      totalSpaceSaved,
      averageCompressionRatio,
      averageProcessingTime,
      byStrategy,
      byFormat,
    };
  }

  /**
   * 获取空统计数据
   */
  private getEmptyStats(): CompressionStatsAggregated {
    return {
      totalFiles: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      totalSpaceSaved: 0,
      averageCompressionRatio: 1,
      averageProcessingTime: 0,
      byStrategy: {},
      byFormat: {},
    };
  }

  /**
   * 检查是否启用统计功能
   */
  private async isStatsEnabled(): Promise<boolean> {
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { key: 'image_compression_stats_enabled' },
      });
      return config?.value === 'true';
    } catch (error) {
      logger.error('检查统计配置失败:', error);
      return true; // 默认启用
    }
  }

  /**
   * 获取统计数据保留天数
   */
  private async getRetentionDays(): Promise<number> {
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { key: 'image_compression_stats_retention_days' },
      });
      return parseInt(config?.value || '30');
    } catch (error) {
      logger.error('获取统计保留配置失败:', error);
      return 30; // 默认30天
    }
  }
}
