import { Request, Response } from 'express';
import { StorageConfigAdminService, StorageConfigData } from '../services/storage-config.admin.service';
import { FileStorageType } from '../../models/file-storage.model';

export class StorageConfigAdminController {
  private storageConfigService: StorageConfigAdminService;

  constructor() {
    this.storageConfigService = new StorageConfigAdminService();
  }

  /**
   * 获取存储配置
   */
  async getStorageConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = await this.storageConfigService.getStorageConfig();

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      console.error('获取存储配置失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取存储配置失败',
      });
    }
  }

  /**
   * 更新存储配置
   */
  async updateStorageConfig(req: Request, res: Response): Promise<void> {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const configData: StorageConfigData = {
        enabled: req.body.enabled,
        storageType: req.body.storageType || FileStorageType.S3,
        endpoint: req.body.endpoint,
        accessKeyId: req.body.accessKeyId,
        secretAccessKey: req.body.secretAccessKey,
        region: req.body.region,
        bucketAvatars: req.body.bucketAvatars,
        bucketAttachments: req.body.bucketAttachments,
        bucketTemp: req.body.bucketTemp,
        bucketSystem: req.body.bucketSystem,
        maxFileSize: req.body.maxFileSize,
        allowedTypes: req.body.allowedTypes,
      };

      // 验证必要字段
      if (configData.enabled && configData.storageType === FileStorageType.S3) {
        if (!configData.endpoint || !configData.accessKeyId || !configData.secretAccessKey) {
          res.status(400).json({
            success: false,
            message: '启用S3存储时，端点、访问密钥ID和访问密钥为必填项',
          });
          return;
        }
      }

      await this.storageConfigService.updateStorageConfig(configData, adminId);

      res.json({
        success: true,
        message: '存储配置更新成功',
      });
    } catch (error) {
      console.error('更新存储配置失败:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '更新存储配置失败',
      });
    }
  }

  /**
   * 测试存储连接
   */
  async testStorageConnection(req: Request, res: Response): Promise<void> {
    try {
      let testConfig: StorageConfigData | undefined;

      // 如果请求体中有配置数据，使用它进行测试
      if (req.body && Object.keys(req.body).length > 0) {
        testConfig = {
          enabled: req.body.enabled,
          storageType: req.body.storageType || FileStorageType.S3,
          endpoint: req.body.endpoint,
          accessKeyId: req.body.accessKeyId,
          secretAccessKey: req.body.secretAccessKey,
          region: req.body.region,
          bucketAvatars: req.body.bucketAvatars,
          bucketAttachments: req.body.bucketAttachments,
          bucketTemp: req.body.bucketTemp,
          bucketSystem: req.body.bucketSystem,
          maxFileSize: req.body.maxFileSize,
          allowedTypes: req.body.allowedTypes,
        };
      }

      const result = await this.storageConfigService.testStorageConnection(testConfig);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('测试存储连接失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '测试存储连接失败',
      });
    }
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.storageConfigService.getStorageStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('获取存储统计失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取存储统计失败',
      });
    }
  }

  /**
   * 重置存储配置为默认值
   */
  async resetStorageConfig(req: Request, res: Response): Promise<void> {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const defaultConfig: StorageConfigData = {
        enabled: true,
        storageType: FileStorageType.S3,
        endpoint: 'http://minio:9000',
        accessKeyId: 'zhiweijz',
        secretAccessKey: 'zhiweijz123456',
        region: 'us-east-1',
        bucketAvatars: 'avatars',
        bucketAttachments: 'transaction-attachments',
        bucketTemp: 'temp-files',
        bucketSystem: 'system-files',
        maxFileSize: 10485760, // 10MB
        allowedTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
        ],
      };

      await this.storageConfigService.updateStorageConfig(defaultConfig, adminId);

      res.json({
        success: true,
        message: '存储配置已重置为默认值',
        data: defaultConfig,
      });
    } catch (error) {
      console.error('重置存储配置失败:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '重置存储配置失败',
      });
    }
  }

  /**
   * 获取存储配置模板
   */
  async getStorageConfigTemplate(req: Request, res: Response): Promise<void> {
    try {
      const templates = {
        minio: {
          name: 'MinIO (本地)',
          description: '本地MinIO对象存储服务',
          config: {
            enabled: true,
            storageType: FileStorageType.S3,
            endpoint: 'http://minio:9000',
            region: 'us-east-1',
            bucketAvatars: 'avatars',
            bucketAttachments: 'transaction-attachments',
            bucketTemp: 'temp-files',
            bucketSystem: 'system-files',
          },
        },
        aws: {
          name: 'Amazon S3',
          description: 'Amazon Web Services S3存储服务',
          config: {
            enabled: true,
            storageType: FileStorageType.S3,
            endpoint: 'https://s3.amazonaws.com',
            region: 'us-east-1',
            bucketAvatars: 'your-app-avatars',
            bucketAttachments: 'your-app-attachments',
            bucketTemp: 'your-app-temp',
            bucketSystem: 'your-app-system',
          },
        },
        aliyun: {
          name: '阿里云OSS',
          description: '阿里云对象存储服务',
          config: {
            enabled: true,
            storageType: FileStorageType.OSS,
            endpoint: 'https://oss-cn-hangzhou.aliyuncs.com',
            region: 'cn-hangzhou',
            bucketAvatars: 'your-app-avatars',
            bucketAttachments: 'your-app-attachments',
            bucketTemp: 'your-app-temp',
            bucketSystem: 'your-app-system',
          },
        },
        tencent: {
          name: '腾讯云COS',
          description: '腾讯云对象存储服务',
          config: {
            enabled: true,
            storageType: FileStorageType.COS,
            endpoint: 'https://cos.ap-beijing.myqcloud.com',
            region: 'ap-beijing',
            bucketAvatars: 'your-app-avatars',
            bucketAttachments: 'your-app-attachments',
            bucketTemp: 'your-app-temp',
            bucketSystem: 'your-app-system',
          },
        },
      };

      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      console.error('获取存储配置模板失败:', error);
      res.status(500).json({
        success: false,
        message: '获取存储配置模板失败',
      });
    }
  }
}
