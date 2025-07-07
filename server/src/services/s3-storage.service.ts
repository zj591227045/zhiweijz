import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CreateBucketCommand,
  HeadBucketCommand,
  ObjectCannedACL,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export interface S3Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  forcePathStyle?: boolean;
}

export interface UploadOptions {
  bucket: string;
  key?: string;
  contentType?: string;
  metadata?: Record<string, string>;
  acl?: ObjectCannedACL;
}

export interface UploadResult {
  bucket: string;
  key: string;
  url: string;
  etag?: string;
}

export interface PresignedUrlOptions {
  bucket: string;
  key: string;
  operation: 'GET' | 'PUT' | 'DELETE';
  expiresIn?: number; // seconds
  contentType?: string;
}

export class S3StorageService {
  private s3Client: S3Client;
  private config: S3Config;

  constructor(config: S3Config) {
    this.config = config;
    this.s3Client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle ?? true, // MinIO需要path style
    });
  }

  /**
   * 上传文件
   */
  async uploadFile(
    file: Buffer | Uint8Array | string | Readable,
    options: UploadOptions,
  ): Promise<UploadResult> {
    try {
      const key = options.key || this.generateKey();
      
      const command = new PutObjectCommand({
        Bucket: options.bucket,
        Key: key,
        Body: file,
        ContentType: options.contentType,
        Metadata: options.metadata,
        ...(options.acl && { ACL: options.acl }),
      });

      const result = await this.s3Client.send(command);
      
      const url = this.getPublicUrl(options.bucket, key);

      return {
        bucket: options.bucket,
        key,
        url,
        etag: result.ETag,
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error(`文件上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 下载文件
   */
  async downloadFile(bucket: string, key: string): Promise<Readable> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const result = await this.s3Client.send(command);
      
      if (!result.Body) {
        throw new Error('文件内容为空');
      }

      return result.Body as Readable;
    } catch (error) {
      console.error('S3 download error:', error);
      throw new Error(`文件下载失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(bucket: string, key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('S3 delete error:', error);
      throw new Error(`文件删除失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(bucket: string, key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(bucket: string, key: string) {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const result = await this.s3Client.send(command);
      
      return {
        contentLength: result.ContentLength,
        contentType: result.ContentType,
        lastModified: result.LastModified,
        etag: result.ETag,
        metadata: result.Metadata,
      };
    } catch (error) {
      console.error('S3 get file info error:', error);
      throw new Error(`获取文件信息失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 列出文件
   */
  async listFiles(bucket: string, prefix?: string, maxKeys?: number) {
    try {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      const result = await this.s3Client.send(command);
      
      return {
        files: result.Contents || [],
        isTruncated: result.IsTruncated,
        nextContinuationToken: result.NextContinuationToken,
      };
    } catch (error) {
      console.error('S3 list files error:', error);
      throw new Error(`列出文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 生成预签名URL
   */
  async generatePresignedUrl(options: PresignedUrlOptions): Promise<string> {
    try {
      const expiresIn = options.expiresIn || 3600; // 默认1小时

      let command;
      switch (options.operation) {
        case 'GET':
          command = new GetObjectCommand({
            Bucket: options.bucket,
            Key: options.key,
          });
          break;
        case 'PUT':
          command = new PutObjectCommand({
            Bucket: options.bucket,
            Key: options.key,
            ContentType: options.contentType,
          });
          break;
        case 'DELETE':
          command = new DeleteObjectCommand({
            Bucket: options.bucket,
            Key: options.key,
          });
          break;
        default:
          throw new Error(`不支持的操作: ${options.operation}`);
      }

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Generate presigned URL error:', error);
      throw new Error(`生成预签名URL失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 创建存储桶
   */
  async createBucket(bucket: string): Promise<void> {
    try {
      // 先检查存储桶是否存在
      try {
        const headCommand = new HeadBucketCommand({ Bucket: bucket });
        await this.s3Client.send(headCommand);
        console.log(`存储桶 ${bucket} 已存在`);
        return;
      } catch (error: any) {
        if (error.name !== 'NotFound' && error.$metadata?.httpStatusCode !== 404) {
          throw error;
        }
      }

      // 创建存储桶
      const command = new CreateBucketCommand({ Bucket: bucket });
      await this.s3Client.send(command);
      console.log(`存储桶 ${bucket} 创建成功`);
    } catch (error) {
      console.error('Create bucket error:', error);
      throw new Error(`创建存储桶失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: 'test-connection', // 使用一个测试桶名
        MaxKeys: 1,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      // 如果是因为桶不存在而失败，说明连接是正常的
      if (error.name === 'NoSuchBucket' || error.$metadata?.httpStatusCode === 404) {
        return true;
      }
      console.error('S3 connection test failed:', error);
      return false;
    }
  }

  /**
   * 获取公共访问URL
   */
  private getPublicUrl(bucket: string, key: string): string {
    const endpoint = this.config.endpoint.replace(/\/$/, '');
    return `${endpoint}/${bucket}/${key}`;
  }

  /**
   * 生成唯一的文件键
   */
  private generateKey(originalName?: string): string {
    const uuid = uuidv4();
    if (originalName) {
      const ext = path.extname(originalName);
      return `${uuid}${ext}`;
    }
    return uuid;
  }

  /**
   * 根据文件类型生成键路径
   */
  generateKeyWithPath(category: string, originalName: string): string {
    const uuid = uuidv4();
    const ext = path.extname(originalName);
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${category}/${year}/${month}/${day}/${uuid}${ext}`;
  }
}
