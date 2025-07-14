import { PrismaClient } from '@prisma/client';
import { S3StorageService, S3Config } from '../../services/s3-storage.service';
import { FileStorageConfigDto, FileStorageType } from '../../models/file-storage.model';

const prisma = new PrismaClient();

export interface ImageCompressionConfig {
  enabled: boolean;
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
  format: 'jpeg' | 'png' | 'webp' | 'auto';
}

export interface StorageConfigData {
  enabled: boolean;
  storageType: FileStorageType;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  bucketAvatars?: string;
  bucketAttachments?: string;
  bucketTemp?: string;
  bucketSystem?: string;
  maxFileSize?: number;
  allowedTypes?: string[];
  // 图片压缩配置
  imageCompression?: {
    globalEnabled: boolean;
    globalQuality: number;
    avatar: ImageCompressionConfig;
    attachment: ImageCompressionConfig;
    multimodal: ImageCompressionConfig;
    general: ImageCompressionConfig;
    mobileOptimization: boolean;
    progressiveJpeg: boolean;
    preserveMetadata: boolean;
  };
}

export interface StorageTestResult {
  success: boolean;
  message: string;
  details?: {
    connection: boolean;
    buckets: {
      name: string;
      exists: boolean;
      accessible: boolean;
    }[];
  };
}

export class StorageConfigAdminService {
  /**
   * 获取存储配置
   */
  async getStorageConfig(): Promise<FileStorageConfigDto> {
    try {
      const configs = await prisma.systemConfig.findMany({
        where: {
          category: 'storage',
        },
      });

      const configMap = configs.reduce((acc, config) => {
        if (config.value) {
          acc[config.key] = config.value;
        }
        return acc;
      }, {} as Record<string, string>);

      return {
        enabled: configMap.s3_enabled === 'true',
        storageType: (configMap.storage_type as FileStorageType) || FileStorageType.S3,
        endpoint: configMap.s3_endpoint,
        accessKeyId: configMap.s3_access_key_id,
        secretAccessKey: configMap.s3_secret_access_key,
        region: configMap.s3_region || 'us-east-1',
        buckets: {
          avatars: configMap.s3_bucket_avatars || 'avatars',
          attachments: configMap.s3_bucket_attachments || 'transaction-attachments',
          temp: configMap.s3_bucket_temp || 'temp-files',
          system: configMap.s3_bucket_system || 'system-files',
        },
        maxFileSize: parseInt(configMap.file_max_size || '10485760'),
        allowedTypes: configMap.file_allowed_types?.split(',') || [],
        imageCompression: {
          globalEnabled: configMap.image_compression_enabled === 'true',
          globalQuality: parseInt(configMap.image_compression_global_quality || '80'),
          avatar: {
            enabled: configMap.image_compression_avatar_enabled === 'true',
            quality: parseInt(configMap.image_compression_avatar_quality || '85'),
            maxWidth: parseInt(configMap.image_compression_avatar_max_width || '512'),
            maxHeight: parseInt(configMap.image_compression_avatar_max_height || '512'),
            format: (configMap.image_compression_avatar_format as any) || 'webp',
          },
          attachment: {
            enabled: configMap.image_compression_attachment_enabled === 'true',
            quality: parseInt(configMap.image_compression_attachment_quality || '80'),
            maxWidth: parseInt(configMap.image_compression_attachment_max_width || '1920'),
            maxHeight: parseInt(configMap.image_compression_attachment_max_height || '1920'),
            format: (configMap.image_compression_attachment_format as any) || 'auto',
          },
          multimodal: {
            enabled: configMap.image_compression_multimodal_enabled === 'true',
            quality: parseInt(configMap.image_compression_multimodal_quality || '90'),
            maxWidth: parseInt(configMap.image_compression_multimodal_max_width || '2048'),
            maxHeight: parseInt(configMap.image_compression_multimodal_max_height || '2048'),
            format: (configMap.image_compression_multimodal_format as any) || 'auto',
          },
          general: {
            enabled: configMap.image_compression_general_enabled === 'true',
            quality: parseInt(configMap.image_compression_general_quality || '80'),
            maxWidth: parseInt(configMap.image_compression_general_max_width || '1920'),
            maxHeight: parseInt(configMap.image_compression_general_max_height || '1920'),
            format: (configMap.image_compression_general_format as any) || 'auto',
          },
          mobileOptimization: configMap.image_compression_mobile_optimization === 'true',
          progressiveJpeg: configMap.image_compression_progressive_jpeg === 'true',
          preserveMetadata: configMap.image_compression_preserve_metadata === 'true',
        },
      };
    } catch (error) {
      console.error('获取存储配置错误:', error);
      throw new Error('获取存储配置失败');
    }
  }

  /**
   * 更新存储配置
   */
  async updateStorageConfig(data: StorageConfigData, updatedBy?: string): Promise<void> {
    try {
      const updates = [
        { key: 's3_enabled', value: data.enabled.toString() },
        { key: 'storage_type', value: data.storageType },
      ];

      if (data.endpoint !== undefined) {
        updates.push({ key: 's3_endpoint', value: data.endpoint });
      }
      if (data.accessKeyId !== undefined) {
        updates.push({ key: 's3_access_key_id', value: data.accessKeyId });
      }
      if (data.secretAccessKey !== undefined) {
        updates.push({ key: 's3_secret_access_key', value: data.secretAccessKey });
      }
      if (data.region !== undefined) {
        updates.push({ key: 's3_region', value: data.region });
      }
      if (data.bucketAvatars !== undefined) {
        updates.push({ key: 's3_bucket_avatars', value: data.bucketAvatars });
      }
      if (data.bucketAttachments !== undefined) {
        updates.push({ key: 's3_bucket_attachments', value: data.bucketAttachments });
      }
      if (data.bucketTemp !== undefined) {
        updates.push({ key: 's3_bucket_temp', value: data.bucketTemp });
      }
      if (data.bucketSystem !== undefined) {
        updates.push({ key: 's3_bucket_system', value: data.bucketSystem });
      }
      if (data.maxFileSize !== undefined) {
        updates.push({ key: 'file_max_size', value: data.maxFileSize.toString() });
      }
      if (data.allowedTypes !== undefined) {
        updates.push({ key: 'file_allowed_types', value: data.allowedTypes.join(',') });
      }

      // 图片压缩配置
      if (data.imageCompression !== undefined) {
        const compression = data.imageCompression;

        // 全局配置
        updates.push(
          { key: 'image_compression_enabled', value: compression.globalEnabled.toString() },
          { key: 'image_compression_global_quality', value: compression.globalQuality.toString() }
        );

        // 头像压缩配置
        updates.push(
          { key: 'image_compression_avatar_enabled', value: compression.avatar.enabled.toString() },
          { key: 'image_compression_avatar_quality', value: compression.avatar.quality.toString() },
          { key: 'image_compression_avatar_max_width', value: compression.avatar.maxWidth?.toString() || '512' },
          { key: 'image_compression_avatar_max_height', value: compression.avatar.maxHeight?.toString() || '512' },
          { key: 'image_compression_avatar_format', value: compression.avatar.format }
        );

        // 交易附件压缩配置
        updates.push(
          { key: 'image_compression_attachment_enabled', value: compression.attachment.enabled.toString() },
          { key: 'image_compression_attachment_quality', value: compression.attachment.quality.toString() },
          { key: 'image_compression_attachment_max_width', value: compression.attachment.maxWidth?.toString() || '1920' },
          { key: 'image_compression_attachment_max_height', value: compression.attachment.maxHeight?.toString() || '1920' },
          { key: 'image_compression_attachment_format', value: compression.attachment.format }
        );

        // 多模态AI压缩配置
        updates.push(
          { key: 'image_compression_multimodal_enabled', value: compression.multimodal.enabled.toString() },
          { key: 'image_compression_multimodal_quality', value: compression.multimodal.quality.toString() },
          { key: 'image_compression_multimodal_max_width', value: compression.multimodal.maxWidth?.toString() || '2048' },
          { key: 'image_compression_multimodal_max_height', value: compression.multimodal.maxHeight?.toString() || '2048' },
          { key: 'image_compression_multimodal_format', value: compression.multimodal.format }
        );

        // 通用压缩配置
        updates.push(
          { key: 'image_compression_general_enabled', value: compression.general.enabled.toString() },
          { key: 'image_compression_general_quality', value: compression.general.quality.toString() },
          { key: 'image_compression_general_max_width', value: compression.general.maxWidth?.toString() || '1920' },
          { key: 'image_compression_general_max_height', value: compression.general.maxHeight?.toString() || '1920' },
          { key: 'image_compression_general_format', value: compression.general.format }
        );

        // 其他配置
        updates.push(
          { key: 'image_compression_mobile_optimization', value: compression.mobileOptimization.toString() },
          { key: 'image_compression_progressive_jpeg', value: compression.progressiveJpeg.toString() },
          { key: 'image_compression_preserve_metadata', value: compression.preserveMetadata.toString() }
        );
      }

      // 批量更新配置
      for (const update of updates) {
        await prisma.systemConfig.upsert({
          where: { key: update.key },
          update: {
            value: update.value,
            updatedBy,
            updatedAt: new Date(),
          },
          create: {
            key: update.key,
            value: update.value,
            category: 'storage',
            description: this.getConfigDescription(update.key),
            createdBy: updatedBy,
            updatedBy: updatedBy,
          },
        });
      }

      // 刷新图片压缩服务配置
      try {
        const { ImageCompressionService } = await import('../../services/image-compression.service');
        const compressionService = ImageCompressionService.getInstance();
        await compressionService.refreshConfig();
        console.log('图片压缩服务配置已刷新');
      } catch (error) {
        console.warn('刷新图片压缩服务配置失败:', error);
      }

      console.log('存储配置更新成功');
    } catch (error) {
      console.error('更新存储配置错误:', error);
      throw new Error('更新存储配置失败');
    }
  }

  /**
   * 测试存储连接
   */
  async testStorageConnection(config?: StorageConfigData): Promise<StorageTestResult> {
    try {
      let testConfig: FileStorageConfigDto;

      if (config) {
        // 使用提供的配置进行测试
        testConfig = {
          enabled: config.enabled,
          storageType: config.storageType,
          endpoint: config.endpoint,
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
          region: config.region || 'us-east-1',
          buckets: {
            avatars: config.bucketAvatars || 'avatars',
            attachments: config.bucketAttachments || 'transaction-attachments',
            temp: config.bucketTemp || 'temp-files',
            system: config.bucketSystem || 'system-files',
          },
          maxFileSize: config.maxFileSize || 10485760,
          allowedTypes: config.allowedTypes || [],
        };
      } else {
        // 使用当前配置进行测试
        testConfig = await this.getStorageConfig();
      }

      if (!testConfig.enabled || testConfig.storageType !== FileStorageType.S3) {
        return {
          success: false,
          message: 'S3存储未启用',
        };
      }

      if (!testConfig.endpoint || !testConfig.accessKeyId || !testConfig.secretAccessKey) {
        return {
          success: false,
          message: 'S3配置不完整，请检查端点、访问密钥等配置',
        };
      }

      // 创建S3服务实例
      const s3Config: S3Config = {
        endpoint: testConfig.endpoint,
        accessKeyId: testConfig.accessKeyId,
        secretAccessKey: testConfig.secretAccessKey,
        region: testConfig.region || 'us-east-1',
        forcePathStyle: true,
      };

      const s3Service = new S3StorageService(s3Config);

      // 测试连接
      const connectionTest = await s3Service.testConnection();
      if (!connectionTest) {
        return {
          success: false,
          message: 'S3连接失败，请检查端点和凭据配置',
        };
      }

      // 测试存储桶
      const buckets = Object.values(testConfig.buckets);
      const bucketTests = [];

      for (const bucketName of buckets) {
        try {
          // 尝试创建存储桶（如果不存在）
          await s3Service.createBucket(bucketName);
          
          // 测试存储桶访问
          const listResult = await s3Service.listFiles(bucketName, undefined, 1);
          
          bucketTests.push({
            name: bucketName,
            exists: true,
            accessible: true,
          });
        } catch (error) {
          console.error(`测试存储桶 ${bucketName} 失败:`, error);
          bucketTests.push({
            name: bucketName,
            exists: false,
            accessible: false,
          });
        }
      }

      const allBucketsOk = bucketTests.every(b => b.exists && b.accessible);

      return {
        success: allBucketsOk,
        message: allBucketsOk ? 'S3存储连接和配置正常' : 'S3连接正常，但部分存储桶配置有问题',
        details: {
          connection: true,
          buckets: bucketTests,
        },
      };
    } catch (error) {
      console.error('测试存储连接错误:', error);
      return {
        success: false,
        message: `存储连接测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByBucket: Record<string, number>;
    filesByType: Record<string, number>;
    bucketInfo: {
      configured: number;
      existing: number;
      buckets: Array<{
        name: string;
        configured: boolean;
        exists: boolean;
        fileCount: number;
      }>;
    };
  }> {
    try {
      // 获取配置的存储桶
      const config = await this.getStorageConfig();
      const configuredBuckets = Object.values(config.buckets);

      // 获取文件统计
      const [totalFiles, sizeResult] = await Promise.all([
        prisma.fileStorage.count({
          where: { status: 'ACTIVE' },
        }),
        prisma.fileStorage.aggregate({
          where: { status: 'ACTIVE' },
          _sum: { size: true },
        }),
      ]);

      const bucketStats = await prisma.fileStorage.groupBy({
        by: ['bucket'],
        where: { status: 'ACTIVE' },
        _count: { id: true },
      });

      const typeStats = await prisma.fileStorage.groupBy({
        by: ['mimeType'],
        where: { status: 'ACTIVE' },
        _count: { id: true },
      });

      const filesByBucket = bucketStats.reduce((acc, stat) => {
        acc[stat.bucket] = stat._count.id;
        return acc;
      }, {} as Record<string, number>);

      // 检查存储桶是否存在（如果S3服务可用）
      let bucketExistenceMap: Record<string, boolean> = {};
      let existingBucketsCount = 0;

      if (config.enabled && config.endpoint && config.accessKeyId && config.secretAccessKey) {
        try {
          const s3Config = {
            endpoint: config.endpoint,
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
            region: config.region || 'us-east-1',
            forcePathStyle: true,
          };

          const s3Service = new (await import('../../services/s3-storage.service')).S3StorageService(s3Config);

          // 检查每个配置的存储桶是否存在
          for (const bucketName of configuredBuckets) {
            try {
              await s3Service.listFiles(bucketName, undefined, 1);
              bucketExistenceMap[bucketName] = true;
              existingBucketsCount++;
            } catch (error: any) {
              // 如果是NoSuchBucket错误，说明存储桶不存在
              if (error.name === 'NoSuchBucket' || error.$metadata?.httpStatusCode === 404) {
                bucketExistenceMap[bucketName] = false;
              } else {
                // 其他错误（如权限问题），假设存储桶存在但无法访问
                bucketExistenceMap[bucketName] = true;
                existingBucketsCount++;
              }
            }
          }
        } catch (error) {
          console.warn('无法检查存储桶存在性:', error);
          // 如果无法连接S3，将所有配置的存储桶标记为未知状态
          configuredBuckets.forEach(bucket => {
            bucketExistenceMap[bucket] = false;
          });
        }
      }

      // 构建存储桶信息
      const bucketInfo = {
        configured: configuredBuckets.length,
        existing: existingBucketsCount,
        buckets: configuredBuckets.map(bucketName => ({
          name: bucketName,
          configured: true,
          exists: bucketExistenceMap[bucketName] || false,
          fileCount: filesByBucket[bucketName] || 0,
        })),
      };

      return {
        totalFiles,
        totalSize: sizeResult._sum.size || 0,
        filesByBucket,
        filesByType: typeStats.reduce((acc, stat) => {
          acc[stat.mimeType] = stat._count.id;
          return acc;
        }, {} as Record<string, number>),
        bucketInfo,
      };
    } catch (error) {
      console.error('获取存储统计错误:', error);
      throw new Error('获取存储统计失败');
    }
  }

  /**
   * 获取配置项描述
   */
  private getConfigDescription(key: string): string {
    const descriptions: Record<string, string> = {
      s3_enabled: '是否启用S3存储',
      storage_type: '存储类型',
      s3_endpoint: 'S3服务端点URL',
      s3_access_key_id: 'S3访问密钥ID',
      s3_secret_access_key: 'S3访问密钥',
      s3_region: 'S3区域',
      s3_bucket_avatars: '头像存储桶名称',
      s3_bucket_attachments: '附件存储桶名称',
      s3_bucket_temp: '临时文件存储桶名称',
      s3_bucket_system: '系统文件存储桶名称',
      file_max_size: '文件最大大小（字节）',
      file_allowed_types: '允许的文件类型（逗号分隔）',
    };
    return descriptions[key] || '';
  }
}
