import { PrismaClient } from '@prisma/client';
import { S3StorageService, S3Config } from '../../services/s3-storage.service';
import { FileStorageConfigDto, FileStorageType } from '../../models/file-storage.model';

const prisma = new PrismaClient();

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
  }> {
    try {
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

      return {
        totalFiles,
        totalSize: sizeResult._sum.size || 0,
        filesByBucket: bucketStats.reduce((acc, stat) => {
          acc[stat.bucket] = stat._count.id;
          return acc;
        }, {} as Record<string, number>),
        filesByType: typeStats.reduce((acc, stat) => {
          acc[stat.mimeType] = stat._count.id;
          return acc;
        }, {} as Record<string, number>),
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
