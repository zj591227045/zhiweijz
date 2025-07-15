import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import { S3Client, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

const execAsync = promisify(exec);

export interface MinIOInitResult {
  success: boolean;
  message?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucketsCreated?: string[];
}

export class MinIOInitializationService {
  private readonly MINIO_ROOT_USER = process.env.MINIO_ROOT_USER || 'zhiweijz';
  private readonly MINIO_ROOT_PASSWORD = process.env.MINIO_ROOT_PASSWORD || 'zhiweijz123456';
  private readonly MINIO_ENDPOINT = 'http://minio:9000';
  private readonly MINIO_ADMIN_ENDPOINT = 'http://minio:9000';
  private readonly REQUIRED_BUCKETS = ['avatars', 'transaction-attachments', 'temp-files', 'system-files'];
  private s3Client: S3Client;

  constructor() {
    // 初始化S3客户端，使用root用户凭据
    this.s3Client = new S3Client({
      endpoint: this.MINIO_ENDPOINT,
      region: 'us-east-1',
      credentials: {
        accessKeyId: this.MINIO_ROOT_USER,
        secretAccessKey: this.MINIO_ROOT_PASSWORD,
      },
      forcePathStyle: true,
    });
  }

  /**
   * 初始化MinIO服务
   */
  async initializeMinIO(): Promise<MinIOInitResult> {
    try {
      console.log('开始初始化MinIO服务...');

      // 1. 检查MinIO服务是否可用
      const isAvailable = await this.checkMinIOAvailability();
      if (!isAvailable) {
        return {
          success: false,
          message: 'MinIO服务不可用，请检查服务状态',
        };
      }

      // 2. 生成访问密钥
      const { accessKeyId, secretAccessKey } = await this.generateAccessKeys();

      // 3. 创建必要的存储桶
      const bucketsCreated = await this.createRequiredBuckets(accessKeyId, secretAccessKey);

      console.log('MinIO初始化完成');
      return {
        success: true,
        message: 'MinIO初始化成功',
        accessKeyId,
        secretAccessKey,
        bucketsCreated,
      };
    } catch (error) {
      console.error('MinIO初始化失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'MinIO初始化失败',
      };
    }
  }

  /**
   * 检查MinIO服务是否可用
   */
  private async checkMinIOAvailability(): Promise<boolean> {
    try {
      console.log('检查MinIO服务可用性...');

      // 使用S3客户端进行健康检查
      const response = await fetch(`${this.MINIO_ENDPOINT}/minio/health/live`);
      const isHealthy = response.ok;

      if (isHealthy) {
        console.log('✅ MinIO服务健康检查通过');
        return true;
      } else {
        console.log('❌ MinIO服务健康检查失败');
        return false;
      }
    } catch (error) {
      console.error('MinIO服务可用性检查失败:', error);
      return false;
    }
  }

  /**
   * 获取访问密钥
   * 在容器环境中，我们直接使用MinIO的root用户凭据
   * 这是最可靠和简单的方案
   */
  private async generateAccessKeys(): Promise<{ accessKeyId: string; secretAccessKey: string }> {
    console.log('配置访问密钥...');

    try {
      // 在容器环境中，直接使用root用户凭据
      // 这确保了访问密钥的有效性和权限
      const accessKeyId = this.MINIO_ROOT_USER;
      const secretAccessKey = this.MINIO_ROOT_PASSWORD;

      console.log(`✅ 使用MinIO root用户凭据`);
      console.log(`✅ 访问密钥ID: ${accessKeyId}`);
      console.log(`✅ 访问密钥: ${secretAccessKey.substring(0, 4)}...`);

      // 验证凭据是否有效
      await this.validateCredentials(accessKeyId, secretAccessKey);

      return { accessKeyId, secretAccessKey };
    } catch (error) {
      console.error('配置访问密钥失败:', error);
      throw new Error('配置访问密钥失败');
    }
  }

  /**
   * 验证凭据有效性
   */
  private async validateCredentials(accessKeyId: string, secretAccessKey: string): Promise<void> {
    try {
      // 创建临时S3客户端来验证凭据
      const testClient = new S3Client({
        endpoint: this.MINIO_ENDPOINT,
        region: 'us-east-1',
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: true,
      });

      // 尝试列出存储桶来验证凭据
      await testClient.send(new HeadBucketCommand({ Bucket: 'test-validation' }));
      console.log('✅ 凭据验证成功');
    } catch (error: any) {
      // 如果是因为存储桶不存在而失败，说明凭据是有效的
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        console.log('✅ 凭据验证成功（通过404响应确认）');
        return;
      }
      console.error('❌ 凭据验证失败:', error);
      throw new Error('MinIO凭据无效');
    }
  }

  /**
   * 创建必要的存储桶
   */
  private async createRequiredBuckets(accessKeyId: string, secretAccessKey: string): Promise<string[]> {
    console.log('创建必要的存储桶...');
    const createdBuckets: string[] = [];

    try {
      // 使用root用户权限创建存储桶（因为新生成的密钥可能还没有在MinIO中注册）
      for (const bucket of this.REQUIRED_BUCKETS) {
        try {
          // 检查存储桶是否存在
          const headCommand = new HeadBucketCommand({ Bucket: bucket });
          await this.s3Client.send(headCommand);
          console.log(`✅ 存储桶 ${bucket} 已存在`);
        } catch (error: any) {
          if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
            // 存储桶不存在，创建它
            try {
              const createCommand = new CreateBucketCommand({ Bucket: bucket });
              await this.s3Client.send(createCommand);
              console.log(`✅ 存储桶 ${bucket} 创建成功`);
              createdBuckets.push(bucket);
            } catch (createError) {
              console.error(`❌ 创建存储桶 ${bucket} 失败:`, createError);
              // 继续创建其他存储桶
            }
          } else {
            console.error(`❌ 检查存储桶 ${bucket} 失败:`, error);
          }
        }
      }

      return createdBuckets;
    } catch (error) {
      console.error('创建存储桶过程失败:', error);
      throw new Error('创建存储桶失败');
    }
  }

  /**
   * 测试MinIO连接
   */
  async testMinIOConnection(): Promise<boolean> {
    try {
      return await this.checkMinIOAvailability();
    } catch (error) {
      console.error('MinIO连接测试失败:', error);
      return false;
    }
  }
}
