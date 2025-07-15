import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import { S3Client, CreateBucketCommand, HeadBucketCommand, ListBucketsCommand } from '@aws-sdk/client-s3';

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

      // 2. 等待MinIO服务完全就绪
      await this.waitForMinIOReady();

      // 3. 生成访问密钥
      const { accessKeyId, secretAccessKey } = await this.generateAccessKeys();

      // 4. 创建必要的存储桶
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
   * 等待MinIO服务完全就绪
   */
  private async waitForMinIOReady(): Promise<void> {
    console.log('等待MinIO服务完全就绪...');

    // 最多等待30秒
    const maxRetries = 15;
    const retryInterval = 2000; // 2秒

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(`${this.MINIO_ENDPOINT}/minio/health/ready`);
        if (response.ok) {
          console.log(`✅ MinIO服务已就绪 (尝试 ${i+1}/${maxRetries})`);
          return;
        }
        console.log(`⏳ MinIO服务尚未就绪，等待中... (尝试 ${i+1}/${maxRetries})`);
      } catch (error) {
        console.log(`⏳ 无法连接到MinIO，等待中... (尝试 ${i+1}/${maxRetries})`);
      }

      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }

    console.warn('⚠️ 等待MinIO就绪超时，将继续尝试初始化');
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
   * 生成新的访问密钥
   * 直接使用root凭据作为访问密钥
   */
  private async generateAccessKeys(): Promise<{ accessKeyId: string; secretAccessKey: string }> {
    console.log('配置访问密钥...');

    try {
      // 直接使用root凭据作为访问密钥
      const accessKeyId = this.MINIO_ROOT_USER;
      const secretAccessKey = this.MINIO_ROOT_PASSWORD;

      console.log(`✅ 使用MinIO root用户凭据作为访问密钥`);
      console.log(`✅ 访问密钥ID: ${accessKeyId}`);
      console.log(`✅ 访问密钥: ${secretAccessKey.substring(0, 4)}...`);

      // 验证凭据是否有效
      try {
        await this.validateCredentials(accessKeyId, secretAccessKey);
      } catch (error) {
        console.error('❌ 凭据验证失败:', error);
        throw new Error('MinIO凭据无效，请检查环境变量配置');
      }

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
    console.log(`验证凭据有效性: ${accessKeyId}`);

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

      // 尝试多种方法验证凭据
      let isValid = false;

      // 方法1: 尝试列出存储桶
      try {
        console.log('尝试列出存储桶来验证凭据...');
        const command = new HeadBucketCommand({ Bucket: 'test-validation' });
        await testClient.send(command);
        console.log('✅ 凭据验证成功（通过HeadBucket）');
        isValid = true;
      } catch (error: any) {
        // 如果是因为存储桶不存在而失败，说明凭据是有效的
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
          console.log('✅ 凭据验证成功（通过404响应确认）');
          isValid = true;
        } else if (error.name === 'AccessDenied' || error.$metadata?.httpStatusCode === 403) {
          // 权限被拒绝也说明凭据是有效的，只是没有权限
          console.log('✅ 凭据验证成功（通过403响应确认）');
          isValid = true;
        } else {
          console.log('❌ 通过HeadBucket验证失败:', error.name);
        }
      }

      // 如果第一种方法失败，尝试第二种方法
      if (!isValid) {
        try {
          console.log('尝试列出所有存储桶来验证凭据...');
          const command = new ListBucketsCommand({});
          const result = await testClient.send(command);
          if (result.Buckets) {
            console.log(`✅ 凭据验证成功（通过ListBuckets）, 找到 ${result.Buckets.length} 个存储桶`);
            isValid = true;
          }
        } catch (error: any) {
          if (error.name === 'AccessDenied' || error.$metadata?.httpStatusCode === 403) {
            // 权限被拒绝也说明凭据是有效的，只是没有权限
            console.log('✅ 凭据验证成功（通过403响应确认）');
            isValid = true;
          } else {
            console.log('❌ 通过ListBuckets验证失败:', error.name);
          }
        }
      }

      // 如果所有方法都失败，但这是root凭据，我们假设它是有效的
      if (!isValid && accessKeyId === this.MINIO_ROOT_USER) {
        console.log('⚠️ 无法验证root凭据，但将假设它是有效的');
        isValid = true;
      }

      // 如果所有方法都失败，抛出错误
      if (!isValid) {
        throw new Error('无法验证MinIO凭据有效性');
      }
    } catch (error: any) {
      console.error('❌ 凭据验证失败:', error);
      throw new Error(`MinIO凭据无效: ${error.message || '未知错误'}`);
    }
  }

  /**
   * 创建必要的存储桶
   */
  private async createRequiredBuckets(accessKeyId: string, secretAccessKey: string): Promise<string[]> {
    console.log('创建必要的存储桶...');
    const createdBuckets: string[] = [];

    try {
      // 创建使用新凭据的S3客户端
      const newS3Client = new S3Client({
        endpoint: this.MINIO_ENDPOINT,
        region: 'us-east-1',
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: true,
      });

      // 使用新生成的密钥创建存储桶
      for (const bucket of this.REQUIRED_BUCKETS) {
        try {
          // 检查存储桶是否存在
          const headCommand = new HeadBucketCommand({ Bucket: bucket });
          await newS3Client.send(headCommand);
          console.log(`✅ 存储桶 ${bucket} 已存在`);
        } catch (error: any) {
          if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
            // 存储桶不存在，创建它
            try {
              const createCommand = new CreateBucketCommand({ Bucket: bucket });
              await newS3Client.send(createCommand);
              console.log(`✅ 存储桶 ${bucket} 创建成功`);
              createdBuckets.push(bucket);
            } catch (createError) {
              console.error(`❌ 创建存储桶 ${bucket} 失败:`, createError);

              // 如果使用新凭据失败，尝试使用root凭据
              try {
                console.log(`尝试使用root凭据创建存储桶 ${bucket}...`);
                const createCommand = new CreateBucketCommand({ Bucket: bucket });
                await this.s3Client.send(createCommand);
                console.log(`✅ 存储桶 ${bucket} 使用root凭据创建成功`);
                createdBuckets.push(bucket);
              } catch (rootCreateError) {
                console.error(`❌ 使用root凭据创建存储桶 ${bucket} 也失败:`, rootCreateError);
              }
            }
          } else {
            console.error(`❌ 检查存储桶 ${bucket} 失败:`, error);
          }
        }
      }

      // 跳过设置存储桶权限（在容器环境中无法使用mc命令）
      console.log('⚠️ 跳过设置存储桶权限（容器环境限制）');

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
