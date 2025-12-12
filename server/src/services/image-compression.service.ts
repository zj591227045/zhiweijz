import { logger } from '../utils/logger';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';
import { CompressionStatsService } from './compression-stats.service';

const prisma = new PrismaClient();

export interface CompressionConfig {
  enabled: boolean;
  quality: number; // 0-100
  maxWidth?: number;
  maxHeight?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'auto';
  progressive?: boolean;
  preserveMetadata?: boolean;
}

export interface CompressionStrategy {
  avatar: CompressionConfig;
  attachment: CompressionConfig;
  multimodal: CompressionConfig;
  general: CompressionConfig;
}

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  format: string;
  buffer: Buffer;
  metadata: {
    width: number;
    height: number;
    channels: number;
    hasAlpha: boolean;
  };
}

export interface CompressionOptions {
  strategy: keyof CompressionStrategy;
  originalFilename?: string;
  mimeType?: string;
  preserveOriginal?: boolean;
}

export class ImageCompressionService {
  private static instance: ImageCompressionService;
  private compressionStrategy: CompressionStrategy;
  private statsService: CompressionStatsService;
  private defaultStrategy: CompressionStrategy = {
    // 头像压缩策略 - 平衡质量和大小，适合移动设备显示
    avatar: {
      enabled: true,
      quality: 85, // 较高质量，保证头像清晰度
      maxWidth: 512, // 适合移动设备的头像尺寸
      maxHeight: 512,
      format: 'webp', // WebP格式，更好的压缩率
      progressive: true,
      preserveMetadata: false,
    },
    // 记账附件压缩策略 - 保持可读性，适度压缩
    attachment: {
      enabled: true,
      quality: 80, // 中等质量，保证文字清晰
      maxWidth: 1920, // 保持较大尺寸以确保可读性
      maxHeight: 1920,
      format: 'auto', // 自动选择最佳格式
      progressive: true,
      preserveMetadata: true, // 保留元数据，可能包含重要信息
    },
    // 多模态AI图片压缩策略 - 保持高质量，确保AI识别准确性
    multimodal: {
      enabled: true,
      quality: 90, // 高质量，确保AI识别准确性
      maxWidth: 2048, // 保持较大尺寸
      maxHeight: 2048,
      format: 'auto',
      progressive: false, // 不使用渐进式，确保AI处理兼容性
      preserveMetadata: true,
    },
    // 通用文件压缩策略
    general: {
      enabled: true,
      quality: 80,
      maxWidth: 1920,
      maxHeight: 1920,
      format: 'auto',
      progressive: true,
      preserveMetadata: false,
    },
  };

  private constructor() {
    this.compressionStrategy = { ...this.defaultStrategy };
    this.statsService = CompressionStatsService.getInstance();
    this.loadConfigFromDatabase();
  }

  public static getInstance(): ImageCompressionService {
    if (!ImageCompressionService.instance) {
      ImageCompressionService.instance = new ImageCompressionService();
    }
    return ImageCompressionService.instance;
  }

  /**
   * 从数据库加载压缩配置
   */
  private async loadConfigFromDatabase(): Promise<void> {
    try {
      const configs = await prisma.systemConfig.findMany({
        where: {
          key: {
            startsWith: 'image_compression_',
          },
        },
      });

      const configMap = configs.reduce((acc, config) => {
        if (config.value !== null) {
          acc[config.key] = config.value;
        }
        return acc;
      }, {} as Record<string, string>);

      // 更新压缩策略
      this.updateCompressionStrategy(configMap);
    } catch (error) {
      logger.warn('加载图片压缩配置失败，使用默认配置:', error);
    }
  }

  /**
   * 更新压缩策略
   */
  private updateCompressionStrategy(configMap: Record<string, string>): void {
    const strategies: (keyof CompressionStrategy)[] = ['avatar', 'attachment', 'multimodal', 'general'];
    
    strategies.forEach(strategy => {
      const config = this.compressionStrategy[strategy];
      
      // 更新各策略的配置
      if (configMap[`image_compression_${strategy}_enabled`] !== undefined) {
        config.enabled = configMap[`image_compression_${strategy}_enabled`] === 'true';
      }
      if (configMap[`image_compression_${strategy}_quality`]) {
        config.quality = Math.max(1, Math.min(100, parseInt(configMap[`image_compression_${strategy}_quality`])));
      }
      if (configMap[`image_compression_${strategy}_max_width`]) {
        config.maxWidth = parseInt(configMap[`image_compression_${strategy}_max_width`]);
      }
      if (configMap[`image_compression_${strategy}_max_height`]) {
        config.maxHeight = parseInt(configMap[`image_compression_${strategy}_max_height`]);
      }
      if (configMap[`image_compression_${strategy}_format`]) {
        config.format = configMap[`image_compression_${strategy}_format`] as any;
      }
    });
  }

  /**
   * 刷新配置（从数据库重新加载）
   */
  public async refreshConfig(): Promise<void> {
    await this.loadConfigFromDatabase();
  }

  /**
   * 获取当前压缩策略
   */
  public getCompressionStrategy(): CompressionStrategy {
    return { ...this.compressionStrategy };
  }

  /**
   * 检查文件是否为图片
   */
  public isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/') && 
           ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'].includes(mimeType);
  }

  /**
   * 压缩图片
   */
  public async compressImage(
    inputBuffer: Buffer,
    options: CompressionOptions,
    userId?: string
  ): Promise<CompressionResult> {
    const config = this.compressionStrategy[options.strategy];
    
    if (!config.enabled) {
      // 如果压缩未启用，返回原始图片信息
      const metadata = await sharp(inputBuffer).metadata();
      return {
        originalSize: inputBuffer.length,
        compressedSize: inputBuffer.length,
        compressionRatio: 1,
        format: metadata.format || 'unknown',
        buffer: inputBuffer,
        metadata: {
          width: metadata.width || 0,
          height: metadata.height || 0,
          channels: metadata.channels || 0,
          hasAlpha: metadata.hasAlpha || false,
        },
      };
    }

    try {
      const startTime = Date.now();
      const originalSize = inputBuffer.length;
      let sharpInstance = sharp(inputBuffer);

      // 获取原始图片信息
      const metadata = await sharpInstance.metadata();
      
      // 调整尺寸（如果需要）
      if (config.maxWidth || config.maxHeight) {
        sharpInstance = sharpInstance.resize(config.maxWidth, config.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true, // 不放大小图片
        });
      }

      // 确定输出格式
      let outputFormat = config.format;
      if (outputFormat === 'auto') {
        // 智能选择格式
        if (metadata.hasAlpha) {
          outputFormat = 'webp'; // 支持透明度的WebP
        } else if (metadata.format === 'png' && metadata.channels === 1) {
          outputFormat = 'png'; // 保持灰度PNG
        } else {
          outputFormat = 'webp'; // 默认使用WebP获得更好压缩率
        }
      }

      // 应用压缩设置
      switch (outputFormat) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({
            quality: config.quality,
            progressive: config.progressive,
            mozjpeg: true, // 使用mozjpeg编码器获得更好压缩
          });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({
            quality: config.quality,
            progressive: config.progressive,
            compressionLevel: Math.floor((100 - config.quality) / 10), // 转换为0-9的压缩级别
          });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({
            quality: config.quality,
            effort: 6, // 高压缩努力度，更好的压缩率
          });
          break;
      }

      // 处理元数据
      if (!config.preserveMetadata) {
        sharpInstance = sharpInstance.withMetadata({});
      }

      const compressedBuffer = await sharpInstance.toBuffer();
      const compressedSize = compressedBuffer.length;
      const compressionRatio = originalSize / compressedSize;

      // 获取压缩后的图片信息
      const compressedMetadata = await sharp(compressedBuffer).metadata();
      const processingTime = Date.now() - startTime;

      const result = {
        originalSize,
        compressedSize,
        compressionRatio,
        format: outputFormat || 'unknown',
        buffer: compressedBuffer,
        metadata: {
          width: compressedMetadata.width || 0,
          height: compressedMetadata.height || 0,
          channels: compressedMetadata.channels || 0,
          hasAlpha: compressedMetadata.hasAlpha || false,
        },
      };

      // 记录压缩统计
      if (userId) {
        try {
          await this.statsService.recordCompressionStats({
            userId,
            strategy: options.strategy,
            originalSize,
            compressedSize,
            compressionRatio,
            originalFormat: metadata.format || 'unknown',
            compressedFormat: outputFormat || 'unknown',
            processingTime,
          });
        } catch (statsError) {
          logger.warn('记录压缩统计失败:', statsError);
          // 统计记录失败不影响主流程
        }
      }

      return result;
    } catch (error) {
      logger.error('图片压缩失败:', error);
      throw new Error(`图片压缩失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 批量压缩图片
   */
  public async compressImages(
    images: Array<{ buffer: Buffer; options: CompressionOptions }>
  ): Promise<CompressionResult[]> {
    const results = await Promise.allSettled(
      images.map(({ buffer, options }) => this.compressImage(buffer, options))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        logger.error(`图片 ${index} 压缩失败:`, result.reason);
        // 返回原始图片作为fallback
        const originalBuffer = images[index].buffer;
        return {
          originalSize: originalBuffer.length,
          compressedSize: originalBuffer.length,
          compressionRatio: 1,
          format: 'unknown',
          buffer: originalBuffer,
          metadata: {
            width: 0,
            height: 0,
            channels: 0,
            hasAlpha: false,
          },
        };
      }
    });
  }

  /**
   * 获取压缩统计信息
   */
  public async getCompressionStats(days: number = 7): Promise<{
    totalFiles: number;
    totalOriginalSize: number;
    totalCompressedSize: number;
    averageCompressionRatio: number;
    spaceSaved: number;
  }> {
    // 这里可以实现压缩统计功能
    // 暂时返回模拟数据
    return {
      totalFiles: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      averageCompressionRatio: 1,
      spaceSaved: 0,
    };
  }
}
