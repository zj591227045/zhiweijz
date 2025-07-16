import { Request, Response } from 'express';
import { FileStorageService } from '../services/file-storage.service';
import {
  FileUploadRequestDto,
  PresignedUrlRequestDto,
  FileStorageQueryParams,
  BUCKET_CONFIG,
} from '../models/file-storage.model';

export class FileStorageController {
  private fileStorageService: FileStorageService;

  constructor() {
    this.fileStorageService = new FileStorageService();
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
        message: '获取存储状态失败',
      });
    }
  }

  /**
   * 上传文件
   */
  async uploadFile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      // 检查存储服务是否可用
      if (!this.fileStorageService.isStorageAvailable()) {
        const status = await this.fileStorageService.getStorageStatus();
        res.status(503).json({
          success: false,
          message: `文件存储服务不可用: ${status.message}`,
          code: 'STORAGE_UNAVAILABLE',
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({ message: '未上传文件' });
        return;
      }

      const uploadRequest: FileUploadRequestDto = {
        bucket: req.body.bucket || BUCKET_CONFIG.TEMP,
        category: req.body.category,
        description: req.body.description,
        expiresIn: req.body.expiresIn ? parseInt(req.body.expiresIn) : undefined,
        metadata: req.body.metadata ? JSON.parse(req.body.metadata) : undefined,
      };

      const result = await this.fileStorageService.uploadFile(
        req.file,
        uploadRequest,
        userId,
      );

      res.status(201).json({
        success: true,
        data: result,
        message: '文件上传成功',
      });
    } catch (error) {
      console.error('文件上传失败:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '文件上传失败',
      });
    }
  }

  /**
   * 获取文件信息
   */
  async getFile(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;
      const file = await this.fileStorageService.getFileById(fileId);

      if (!file) {
        res.status(404).json({
          success: false,
          message: '文件不存在',
        });
        return;
      }

      res.json({
        success: true,
        data: file,
      });
    } catch (error) {
      console.error('获取文件信息失败:', error);
      res.status(500).json({
        success: false,
        message: '获取文件信息失败',
      });
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const { fileId } = req.params;
      await this.fileStorageService.deleteFile(fileId, userId);

      res.json({
        success: true,
        message: '文件删除成功',
      });
    } catch (error) {
      console.error('删除文件失败:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '删除文件失败',
      });
    }
  }

  /**
   * 获取文件列表
   */
  async getFiles(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const params: FileStorageQueryParams = {
        uploadedBy: userId,
        bucket: req.query.bucket as string,
        storageType: req.query.storageType as any,
        status: req.query.status as any,
        mimeType: req.query.mimeType as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      };

      const result = await this.fileStorageService.getFiles(params);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('获取文件列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取文件列表失败',
      });
    }
  }

  /**
   * 生成预签名URL
   */
  async generatePresignedUrl(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const request: PresignedUrlRequestDto = req.body;

      // 验证请求参数
      if (!request.bucket || !request.key || !request.operation) {
        res.status(400).json({
          success: false,
          message: '缺少必要参数: bucket, key, operation',
        });
        return;
      }

      const result = await this.fileStorageService.generatePresignedUrl(request);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('生成预签名URL失败:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '生成预签名URL失败',
      });
    }
  }

  /**
   * 测试存储连接
   */
  async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const isConnected = await this.fileStorageService.testConnection();

      res.json({
        success: true,
        data: {
          connected: isConnected,
          message: isConnected ? '存储连接正常' : '存储连接失败',
        },
      });
    } catch (error) {
      console.error('测试存储连接失败:', error);
      res.status(500).json({
        success: false,
        message: '测试存储连接失败',
      });
    }
  }

  /**
   * 上传头像
   */
  async uploadAvatar(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ message: '未上传文件' });
        return;
      }

      const uploadRequest: FileUploadRequestDto = {
        bucket: BUCKET_CONFIG.AVATARS,
        category: 'avatar',
        description: '用户头像',
      };

      const result = await this.fileStorageService.uploadFile(
        req.file,
        uploadRequest,
        userId,
      );

      res.status(201).json({
        success: true,
        data: result,
        message: '头像上传成功',
      });
    } catch (error) {
      console.error('头像上传失败:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '头像上传失败',
      });
    }
  }

  /**
   * 上传交易附件
   */
  async uploadAttachment(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ message: '未上传文件' });
        return;
      }

      const uploadRequest: FileUploadRequestDto = {
        bucket: BUCKET_CONFIG.ATTACHMENTS,
        category: 'attachments',
        description: req.body.description || '交易附件',
        metadata: {
          transactionId: req.body.transactionId,
          attachmentType: req.body.attachmentType || 'RECEIPT',
        },
      };

      const result = await this.fileStorageService.uploadFile(
        req.file,
        uploadRequest,
        userId,
      );

      res.status(201).json({
        success: true,
        data: result,
        message: '附件上传成功',
      });
    } catch (error) {
      console.error('附件上传失败:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '附件上传失败',
      });
    }
  }

  /**
   * 清理过期文件
   */
  async cleanupExpiredFiles(req: Request, res: Response): Promise<void> {
    try {
      const deletedCount = await this.fileStorageService.cleanupExpiredFiles();

      res.json({
        success: true,
        data: {
          deletedCount,
          message: `已清理 ${deletedCount} 个过期文件`,
        },
      });
    } catch (error) {
      console.error('清理过期文件失败:', error);
      res.status(500).json({
        success: false,
        message: '清理过期文件失败',
      });
    }
  }
}
