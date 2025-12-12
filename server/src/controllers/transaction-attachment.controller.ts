import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import { TransactionAttachmentRepository } from '../repositories/file-storage.repository';
import { FileStorageService } from '../services/file-storage.service';
import {
  CreateTransactionAttachmentDto,
  FileUploadRequestDto,
  BUCKET_CONFIG,
  AttachmentType,
} from '../models/file-storage.model';

export class TransactionAttachmentController {
  private attachmentRepository: TransactionAttachmentRepository;
  private fileStorageService: FileStorageService;

  constructor() {
    this.attachmentRepository = new TransactionAttachmentRepository();
    this.fileStorageService = FileStorageService.getInstance();
  }

  /**
   * 为记账添加附件
   */
  async addAttachment(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const { transactionId } = req.params;
      const { attachmentType = AttachmentType.RECEIPT, description } = req.body;

      if (!req.file) {
        res.status(400).json({ message: '未上传文件' });
        return;
      }

      // 上传文件到S3
      const uploadRequest: FileUploadRequestDto = {
        bucket: BUCKET_CONFIG.ATTACHMENTS,
        category: 'attachments',
        description: description || '记账附件',
        metadata: {
          transactionId,
          attachmentType,
        },
      };

      const uploadResult = await this.fileStorageService.uploadFile(
        req.file,
        uploadRequest,
        userId,
      );

      // 创建附件关联
      const attachmentData: CreateTransactionAttachmentDto = {
        transactionId,
        fileId: uploadResult.fileId,
        attachmentType,
        description,
      };

      const attachment = await this.attachmentRepository.create(attachmentData);

      res.status(201).json({
        success: true,
        data: {
          attachment,
          file: uploadResult,
        },
        message: '附件添加成功',
      });
    } catch (error) {
      logger.error('添加记账附件失败:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '添加附件失败',
      });
    }
  }

  /**
   * 获取记账的所有附件
   */
  async getTransactionAttachments(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const { transactionId } = req.params;
      const attachments = await this.attachmentRepository.findByTransactionId(transactionId);

      res.json({
        success: true,
        data: attachments,
      });
    } catch (error) {
      logger.error('获取记账附件失败:', error);
      res.status(500).json({
        success: false,
        message: '获取记账附件失败',
      });
    }
  }

  /**
   * 关联已上传的文件到记账
   */
  async linkFileToTransaction(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const { transactionId } = req.params;
      const { fileId, attachmentType = AttachmentType.RECEIPT, description } = req.body;

      if (!fileId) {
        res.status(400).json({ message: '文件ID不能为空' });
        return;
      }

      // 验证文件是否存在且属于当前用户
      const file = await this.fileStorageService.getFileInfo(fileId, userId);
      if (!file) {
        res.status(404).json({ message: '文件不存在或无权限访问' });
        return;
      }

      // 创建附件关联
      const attachmentData: CreateTransactionAttachmentDto = {
        transactionId,
        fileId,
        attachmentType,
        description: description || file.originalName,
      };

      const attachment = await this.attachmentRepository.create(attachmentData);

      res.status(201).json({
        success: true,
        data: attachment,
        message: '文件关联成功',
      });
    } catch (error) {
      logger.error('关联文件到记账失败:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '关联文件失败',
      });
    }
  }

  /**
   * 删除记账附件
   */
  async deleteAttachment(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const { attachmentId } = req.params;
      logger.info('📎 删除附件请求:', { attachmentId, userId });

      // 首先尝试通过 fileId 查找附件
      let attachments = await this.attachmentRepository.findByFileId(attachmentId);

      // 如果通过 fileId 找不到，尝试直接通过附件ID查找
      if (attachments.length === 0) {
        logger.info('📎 通过 fileId 未找到附件，尝试通过附件ID查找');
        // 这里需要添加一个通过附件ID查找的方法
        const attachment = await this.attachmentRepository.findById(attachmentId);
        if (attachment) {
          attachments = [attachment as any];
        }
      }

      if (attachments.length === 0) {
        logger.info('📎 附件不存在:', attachmentId);
        res.status(404).json({
          success: false,
          message: '附件不存在',
        });
        return;
      }

      const attachment = attachments[0];
      logger.info('📎 找到附件:', {
        attachmentId: attachment.id,
        fileId: attachment.fileId,
        transactionUserId: attachment.transaction?.userId
      });

      // 检查权限（通过记账记录的用户ID）
      if (attachment.transaction?.userId !== userId) {
        res.status(403).json({
          success: false,
          message: '无权限删除此附件',
        });
        return;
      }

      // 删除附件关联
      await this.attachmentRepository.delete(attachment.id);

      // 删除文件
      await this.fileStorageService.deleteFile(attachment.fileId, userId);

      logger.info('📎 附件删除成功:', attachment.id);
      res.json({
        success: true,
        message: '附件删除成功',
      });
    } catch (error) {
      logger.error('删除记账附件失败:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '删除附件失败',
      });
    }
  }

  /**
   * 批量上传记账附件
   */
  async batchUploadAttachments(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const { transactionId } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(400).json({ message: '未上传文件' });
        return;
      }

      const results = [];

      for (const file of files) {
        try {
          // 上传文件
          const uploadRequest: FileUploadRequestDto = {
            bucket: BUCKET_CONFIG.ATTACHMENTS,
            category: 'attachments',
            description: `记账附件 - ${file.originalname}`,
            metadata: {
              transactionId,
              attachmentType: AttachmentType.RECEIPT,
            },
          };

          const uploadResult = await this.fileStorageService.uploadFile(
            file,
            uploadRequest,
            userId,
          );

          // 创建附件关联
          const attachmentData: CreateTransactionAttachmentDto = {
            transactionId,
            fileId: uploadResult.fileId,
            attachmentType: AttachmentType.RECEIPT,
            description: `记账附件 - ${file.originalname}`,
          };

          const attachment = await this.attachmentRepository.create(attachmentData);

          results.push({
            success: true,
            attachment,
            file: uploadResult,
          });
        } catch (error) {
          results.push({
            success: false,
            filename: file.originalname,
            error: error instanceof Error ? error.message : '上传失败',
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      res.status(201).json({
        success: true,
        data: {
          results,
          summary: {
            total: results.length,
            success: successCount,
            failed: failCount,
          },
        },
        message: `批量上传完成：成功 ${successCount} 个，失败 ${failCount} 个`,
      });
    } catch (error) {
      logger.error('批量上传记账附件失败:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '批量上传失败',
      });
    }
  }

  /**
   * 获取用户的附件统计
   */
  async getAttachmentStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const stats = await this.attachmentRepository.getAttachmentStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('获取附件统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取附件统计失败',
      });
    }
  }
}
