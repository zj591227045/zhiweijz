import { Request, Response } from 'express';
import { FileStorageService } from '../services/file-storage.service';
import { S3StorageService } from '../services/s3-storage.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ImageProxyController {
  private fileStorageService: FileStorageService;

  constructor() {
    this.fileStorageService = new FileStorageService();
  }

  /**
   * 代理访问S3存储的图片
   * 路径格式: /api/image-proxy/s3/:bucket/:key
   */
  async proxyS3Image(req: Request, res: Response): Promise<void> {
    try {
      const { bucket } = req.params;
      // 对于路由 /s3/:bucket/*，通配符部分在 req.params[0] 中
      const keyPath = req.params[0]; // 获取完整的key路径

      console.log('🖼️ 图片代理请求:', {
        bucket,
        keyPath,
        originalUrl: req.originalUrl,
        allParams: req.params
      });

      // 检查存储服务是否可用
      if (!this.fileStorageService.isStorageAvailable()) {
        res.status(503).json({
          success: false,
          message: '文件存储服务不可用',
          code: 'STORAGE_UNAVAILABLE',
        });
        return;
      }

      // 获取S3服务实例
      const s3Service = this.fileStorageService.getS3Service();
      if (!s3Service) {
        res.status(503).json({
          success: false,
          message: 'S3存储服务未初始化',
          code: 'S3_UNAVAILABLE',
        });
        return;
      }

      // 从S3下载文件
      const fileStream = await s3Service.downloadFile(bucket, keyPath);

      // 设置响应头
      res.setHeader('Content-Type', this.getContentType(keyPath));
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 缓存1小时
      res.setHeader('Access-Control-Allow-Origin', '*');

      // 将文件流传输到响应
      fileStream.pipe(res);

      fileStream.on('error', (error) => {
        console.error('文件流错误:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: '文件读取失败',
          });
        }
      });

    } catch (error) {
      console.error('图片代理失败:', error);
      
      if (!res.headersSent) {
        res.status(404).json({
          success: false,
          message: error instanceof Error ? error.message : '图片获取失败',
        });
      }
    }
  }

  /**
   * 代理访问用户头像
   * 路径格式: /api/image-proxy/avatar/:userId
   */
  async proxyUserAvatar(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requestUserId = req.user?.id;

      console.log('👤 用户头像代理请求:', { userId, requestUserId });

      // 查找用户信息
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatar: true, name: true },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: '用户不存在',
        });
        return;
      }

      // 如果用户没有自定义头像，返回默认头像
      if (!user.avatar || !user.avatar.startsWith('http')) {
        res.status(404).json({
          success: false,
          message: '用户未设置自定义头像',
        });
        return;
      }

      // 解析S3 URL获取bucket和key
      const s3UrlMatch = user.avatar.match(/https?:\/\/[^\/]+\/([^\/]+)\/(.+)/);
      if (!s3UrlMatch) {
        res.status(400).json({
          success: false,
          message: '无效的头像URL格式',
        });
        return;
      }

      const [, bucket, key] = s3UrlMatch;

      // 检查存储服务是否可用
      if (!this.fileStorageService.isStorageAvailable()) {
        res.status(503).json({
          success: false,
          message: '文件存储服务不可用',
          code: 'STORAGE_UNAVAILABLE',
        });
        return;
      }

      // 获取S3服务实例
      const s3Service = this.fileStorageService.getS3Service();
      if (!s3Service) {
        res.status(503).json({
          success: false,
          message: 'S3存储服务未初始化',
          code: 'S3_UNAVAILABLE',
        });
        return;
      }

      // 从S3下载文件
      const fileStream = await s3Service.downloadFile(bucket, key);

      // 设置响应头
      res.setHeader('Content-Type', this.getContentType(key));
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 缓存1小时
      res.setHeader('Access-Control-Allow-Origin', '*');

      // 将文件流传输到响应
      fileStream.pipe(res);

      fileStream.on('error', (error) => {
        console.error('头像文件流错误:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: '头像读取失败',
          });
        }
      });

    } catch (error) {
      console.error('用户头像代理失败:', error);
      
      if (!res.headersSent) {
        res.status(404).json({
          success: false,
          message: error instanceof Error ? error.message : '头像获取失败',
        });
      }
    }
  }

  /**
   * 根据文件扩展名获取Content-Type
   */
  private getContentType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'svg':
        return 'image/svg+xml';
      case 'bmp':
        return 'image/bmp';
      case 'ico':
        return 'image/x-icon';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * 获取图片信息（不下载文件内容）
   */
  async getImageInfo(req: Request, res: Response): Promise<void> {
    try {
      const { bucket } = req.params;
      const keyPath = req.params[0];

      console.log('ℹ️ 图片信息请求:', { bucket, keyPath });

      // 检查存储服务是否可用
      if (!this.fileStorageService.isStorageAvailable()) {
        res.status(503).json({
          success: false,
          message: '文件存储服务不可用',
          code: 'STORAGE_UNAVAILABLE',
        });
        return;
      }

      // 获取S3服务实例
      const s3Service = this.fileStorageService.getS3Service();
      if (!s3Service) {
        res.status(503).json({
          success: false,
          message: 'S3存储服务未初始化',
          code: 'S3_UNAVAILABLE',
        });
        return;
      }

      // 获取文件元数据
      const metadata = await s3Service.getFileMetadata(bucket, keyPath);

      res.json({
        success: true,
        data: {
          bucket,
          key: keyPath,
          contentType: metadata.ContentType,
          contentLength: metadata.ContentLength,
          lastModified: metadata.LastModified,
          etag: metadata.ETag,
        },
      });

    } catch (error) {
      console.error('获取图片信息失败:', error);
      res.status(404).json({
        success: false,
        message: error instanceof Error ? error.message : '图片信息获取失败',
      });
    }
  }
}
