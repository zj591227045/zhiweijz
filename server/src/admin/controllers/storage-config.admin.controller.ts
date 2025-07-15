import { Request, Response } from 'express';
import { StorageConfigAdminService, StorageConfigData } from '../services/storage-config.admin.service';
import { FileStorageType } from '../../models/file-storage.model';
import { FileStorageService, reloadGlobalFileStorageConfig } from '../../services/file-storage.service';
import { MinIOInitializationService } from '../services/minio-initialization.service';

export class StorageConfigAdminController {
  private storageConfigService: StorageConfigAdminService;
  private fileStorageService: FileStorageService;

  constructor() {
    this.storageConfigService = new StorageConfigAdminService();
    this.fileStorageService = new FileStorageService();
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
      const adminId = req.admin?.id;
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

      // 重新加载文件存储服务配置
      await reloadGlobalFileStorageConfig();

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
      const adminId = req.admin?.id;
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

      // 重新加载文件存储服务配置
      await reloadGlobalFileStorageConfig();

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

  /**
   * 获取存储服务状态
   */
  async getStorageStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await this.fileStorageService.getStorageStatus();

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error('获取存储状态失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取存储状态失败',
      });
    }
  }

  /**
   * 详细诊断存储服务
   */
  async diagnoseStorage(req: Request, res: Response): Promise<void> {
    try {
      const diagnosis = {
        timestamp: new Date().toISOString(),
        steps: [] as any[],
      };

      // 步骤1: 检查配置
      diagnosis.steps.push({
        step: 1,
        name: '检查存储配置',
        status: 'running',
      });

      let config;
      try {
        config = await this.storageConfigService.getStorageConfig();
        diagnosis.steps[0].status = 'success';
        diagnosis.steps[0].data = {
          enabled: config.enabled,
          storageType: config.storageType,
          endpoint: config.endpoint,
          hasAccessKey: !!config.accessKeyId,
          hasSecretKey: !!config.secretAccessKey,
          region: config.region,
          buckets: config.buckets,
        };
      } catch (error) {
        diagnosis.steps[0].status = 'error';
        diagnosis.steps[0].error = error instanceof Error ? error.message : '获取配置失败';
        res.json({ success: true, data: diagnosis });
        return;
      }

      // 步骤2: 检查服务状态
      diagnosis.steps.push({
        step: 2,
        name: '检查文件存储服务状态',
        status: 'running',
      });

      const serviceStatus = await this.fileStorageService.getStorageStatus();
      diagnosis.steps[1].status = 'success';
      diagnosis.steps[1].data = serviceStatus;

      // 步骤3: 测试基础连接
      diagnosis.steps.push({
        step: 3,
        name: '测试S3基础连接',
        status: 'running',
      });

      if (!config.enabled) {
        diagnosis.steps[2].status = 'skipped';
        diagnosis.steps[2].reason = '存储服务未启用';
      } else if (!config.endpoint || !config.accessKeyId || !config.secretAccessKey) {
        diagnosis.steps[2].status = 'error';
        diagnosis.steps[2].error = '配置不完整';
      } else {
        try {
          const testResult = await this.storageConfigService.testStorageConnection();
          diagnosis.steps[2].status = testResult.success ? 'success' : 'error';
          diagnosis.steps[2].data = testResult;
        } catch (error) {
          diagnosis.steps[2].status = 'error';
          diagnosis.steps[2].error = error instanceof Error ? error.message : '连接测试失败';
        }
      }

      // 步骤4: 检查存储桶
      diagnosis.steps.push({
        step: 4,
        name: '检查存储桶状态',
        status: 'running',
      });

      if (!config.enabled || diagnosis.steps[2].status !== 'success') {
        diagnosis.steps[3].status = 'skipped';
        diagnosis.steps[3].reason = '前置步骤失败';
      } else {
        try {
          // 这里可以添加更详细的存储桶检查
          diagnosis.steps[3].status = 'success';
          diagnosis.steps[3].data = {
            buckets: Object.entries(config.buckets).map(([type, name]) => ({
              type,
              name,
              status: 'unknown', // 可以进一步实现具体检查
            })),
          };
        } catch (error) {
          diagnosis.steps[3].status = 'error';
          diagnosis.steps[3].error = error instanceof Error ? error.message : '存储桶检查失败';
        }
      }

      res.json({
        success: true,
        data: diagnosis,
      });
    } catch (error) {
      console.error('存储诊断失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '存储诊断失败',
      });
    }
  }

  /**
   * 初始化MinIO服务并生成访问密钥
   */
  async initializeMinIO(req: Request, res: Response): Promise<void> {
    try {
      const adminId = req.admin?.id;
      if (!adminId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const minioInitService = new MinIOInitializationService();
      const result = await minioInitService.initializeMinIO();

      if (result.success) {
        // 更新存储配置
        const configData: StorageConfigData = {
          enabled: true,
          storageType: FileStorageType.S3,
          endpoint: 'http://minio:9000',
          accessKeyId: result.accessKeyId!,
          secretAccessKey: result.secretAccessKey!,
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

        await this.storageConfigService.updateStorageConfig(configData, adminId);

        // 重新加载文件存储服务配置
        await reloadGlobalFileStorageConfig();

        res.json({
          success: true,
          message: 'MinIO初始化成功',
          data: {
            accessKeyId: result.accessKeyId,
            endpoint: 'http://minio:9000',
            region: 'us-east-1',
            bucketsCreated: result.bucketsCreated,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message || 'MinIO初始化失败',
        });
      }
    } catch (error) {
      console.error('MinIO初始化失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'MinIO初始化失败',
      });
    }
  }
}
