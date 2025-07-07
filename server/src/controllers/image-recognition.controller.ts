import { Request, Response } from 'express';
import { ImageRecognitionService } from '../services/image-recognition.service';
import {
  ImageRecognitionRequestDto,
  BatchImageRecognitionRequestDto,
  RecognitionValidationDto,
  ImageRecognitionType,
} from '../models/image-recognition.model';

export class ImageRecognitionController {
  private imageRecognitionService: ImageRecognitionService;

  constructor() {
    this.imageRecognitionService = new ImageRecognitionService();
  }

  /**
   * 识别单个图片
   */
  async recognizeImage(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const request: ImageRecognitionRequestDto = {
        fileId: req.body.fileId,
        recognitionType: req.body.recognitionType || ImageRecognitionType.RECEIPT,
        options: req.body.options,
      };

      // 验证必要参数
      if (!request.fileId) {
        res.status(400).json({
          success: false,
          message: '文件ID不能为空',
        });
        return;
      }

      const result = await this.imageRecognitionService.recognizeImage(request, userId);

      res.json({
        success: true,
        data: result,
        message: '图片识别完成',
      });
    } catch (error) {
      console.error('图片识别失败:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '图片识别失败',
      });
    }
  }

  /**
   * 批量识别图片
   */
  async batchRecognizeImages(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const request: BatchImageRecognitionRequestDto = {
        fileIds: req.body.fileIds,
        recognitionType: req.body.recognitionType || ImageRecognitionType.RECEIPT,
        options: req.body.options,
      };

      // 验证必要参数
      if (!request.fileIds || !Array.isArray(request.fileIds) || request.fileIds.length === 0) {
        res.status(400).json({
          success: false,
          message: '文件ID列表不能为空',
        });
        return;
      }

      if (request.fileIds.length > 50) {
        res.status(400).json({
          success: false,
          message: '批量识别最多支持50个文件',
        });
        return;
      }

      const result = await this.imageRecognitionService.batchRecognizeImages(request, userId);

      res.json({
        success: true,
        data: result,
        message: '批量图片识别完成',
      });
    } catch (error) {
      console.error('批量图片识别失败:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '批量图片识别失败',
      });
    }
  }

  /**
   * 验证识别结果
   */
  async validateRecognition(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const validation: RecognitionValidationDto = {
        recognitionId: req.body.recognitionId,
        validatedData: req.body.validatedData,
        corrections: req.body.corrections || [],
        isAccurate: req.body.isAccurate,
        feedback: req.body.feedback,
      };

      // 验证必要参数
      if (!validation.recognitionId) {
        res.status(400).json({
          success: false,
          message: '识别ID不能为空',
        });
        return;
      }

      await this.imageRecognitionService.validateRecognition(validation, userId);

      res.json({
        success: true,
        message: '识别结果验证成功',
      });
    } catch (error) {
      console.error('验证识别结果失败:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '验证识别结果失败',
      });
    }
  }

  /**
   * 获取识别统计信息
   */
  async getRecognitionStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const stats = await this.imageRecognitionService.getRecognitionStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('获取识别统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取识别统计失败',
      });
    }
  }

  /**
   * 获取识别配置
   */
  async getRecognitionConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = await this.imageRecognitionService.getRecognitionConfig();

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      console.error('获取识别配置失败:', error);
      res.status(500).json({
        success: false,
        message: '获取识别配置失败',
      });
    }
  }

  /**
   * 更新识别配置（管理员功能）
   */
  async updateRecognitionConfig(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      // 这里应该检查管理员权限
      // const isAdmin = await this.checkAdminPermission(userId);
      // if (!isAdmin) {
      //   res.status(403).json({ message: '需要管理员权限' });
      //   return;
      // }

      const config = req.body;
      await this.imageRecognitionService.updateRecognitionConfig(config, userId);

      res.json({
        success: true,
        message: '识别配置更新成功',
      });
    } catch (error) {
      console.error('更新识别配置失败:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '更新识别配置失败',
      });
    }
  }

  /**
   * 获取支持的识别类型
   */
  async getSupportedTypes(req: Request, res: Response): Promise<void> {
    try {
      const types = [
        {
          type: ImageRecognitionType.RECEIPT,
          name: '收据识别',
          description: '识别购物收据、餐饮小票等',
          supportedFields: ['merchantName', 'totalAmount', 'transactionDate', 'items'],
        },
        {
          type: ImageRecognitionType.INVOICE,
          name: '发票识别',
          description: '识别增值税发票、普通发票等',
          supportedFields: ['merchantName', 'totalAmount', 'tax', 'invoiceNumber', 'transactionDate'],
        },
        {
          type: ImageRecognitionType.BANK_STATEMENT,
          name: '银行流水识别',
          description: '识别银行对账单、流水记录',
          supportedFields: ['amount', 'transactionDate', 'description', 'balance'],
        },
        {
          type: ImageRecognitionType.BUSINESS_CARD,
          name: '名片识别',
          description: '识别商务名片信息',
          supportedFields: ['name', 'company', 'phone', 'email', 'address'],
        },
        {
          type: ImageRecognitionType.ID_CARD,
          name: '身份证识别',
          description: '识别身份证信息',
          supportedFields: ['name', 'idNumber', 'address', 'issueDate'],
        },
      ];

      res.json({
        success: true,
        data: types,
      });
    } catch (error) {
      console.error('获取支持的识别类型失败:', error);
      res.status(500).json({
        success: false,
        message: '获取支持的识别类型失败',
      });
    }
  }

  /**
   * 测试识别服务连接
   */
  async testRecognitionService(req: Request, res: Response): Promise<void> {
    try {
      // 这里应该测试实际的识别服务连接
      // const isHealthy = await this.imageRecognitionService.testConnection();
      
      // 目前返回模拟结果
      const isHealthy = true;

      res.json({
        success: true,
        data: {
          healthy: isHealthy,
          message: isHealthy ? '识别服务连接正常' : '识别服务连接失败',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('测试识别服务失败:', error);
      res.status(500).json({
        success: false,
        message: '测试识别服务失败',
      });
    }
  }
}
