import { Request, Response } from 'express';
import { SpeechRecognitionService } from '../services/speech-recognition.service';
import { VisionRecognitionService } from '../services/vision-recognition.service';
import { MultimodalAIConfigService } from '../services/multimodal-ai-config.service';
import { FileStorageService } from '../services/file-storage.service';
import AccountingPointsService from '../services/accounting-points.service';
import { MembershipService } from '../services/membership.service';
import {
  SpeechRecognitionRequest,
  VisionRecognitionRequest,
  MultimodalAIError,
  MultimodalAIErrorType,
} from '../models/multimodal-ai.model';
import { BUCKET_CONFIG } from '../models/file-storage.model';
import { SourceDetectionUtil } from '../utils/source-detection.util';
import { MultimodalAILoggingService } from '../admin/middleware/multimodal-ai-logging.middleware';

/**
 * 多模态AI控制器
 * 处理语音识别和视觉识别的API请求
 */
export class MultimodalAIController {
  private speechService: SpeechRecognitionService;
  private visionService: VisionRecognitionService;
  private configService: MultimodalAIConfigService;
  private fileStorageService: FileStorageService;
  private membershipService: MembershipService;

  constructor() {
    this.speechService = new SpeechRecognitionService();
    this.visionService = new VisionRecognitionService();
    this.configService = new MultimodalAIConfigService();
    this.fileStorageService = new FileStorageService();
    this.membershipService = new MembershipService();
  }

  /**
   * 获取用户的默认账本信息
   */
  private async getDefaultAccountBookInfo(userId: string): Promise<{ id?: string; name?: string }> {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const defaultAccountBook = await prisma.accountBook.findFirst({
        where: {
          OR: [
            { userId: userId, isDefault: true },
            { userId: userId }
          ]
        },
        select: { id: true, name: true },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
      });
      await prisma.$disconnect();

      return {
        id: defaultAccountBook?.id,
        name: defaultAccountBook?.name
      };
    } catch (error) {
      console.warn('获取默认账本信息失败:', error);
      return {};
    }
  }

  /**
   * 语音转文本
   * POST /api/ai/speech-to-text
   */
  async speechToText(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    let isSuccess = false;
    let errorMessage: string | undefined;
    let speechConfig: any = null;
    let recognizedText: string | undefined;

    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: '用户未认证' });
        return;
      }

      // 检查是否上传了文件
      if (!req.file) {
        res.status(400).json({ success: false, error: '未上传音频文件' });
        return;
      }

      // 获取语音识别配置（用于日志记录）
      try {
        speechConfig = await this.configService.getSpeechConfig();
      } catch (configError) {
        console.warn('获取语音识别配置失败:', configError);
      }

      // 检测请求来源
      const source = SourceDetectionUtil.detectSource(req);

      // 构建请求
      const speechRequest: SpeechRecognitionRequest = {
        audioFile: req.file,
        language: req.body.language,
        format: req.body.format,
      };

      // 调用语音识别服务
      const result = await this.speechService.speechToText(speechRequest);

      isSuccess = result.success;
      if (!isSuccess) {
        errorMessage = result.error;
      } else {
        // 记录识别的文本内容
        recognizedText = result.data?.text;
      }

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          usage: result.usage,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          usage: result.usage,
        });
      }
    } catch (error) {
      isSuccess = false;
      errorMessage = error instanceof Error ? error.message : '语音识别服务暂时不可用';
      console.error('语音转文本API错误:', error);
      res.status(500).json({
        success: false,
        error: '语音识别服务暂时不可用',
      });
    } finally {
      // 记录多模态AI调用日志
      if (req.user?.id && req.file) {
        const duration = Date.now() - startTime;
        const user = req.user as any;

        // 获取默认账本信息
        const accountBookInfo = await this.getDefaultAccountBookInfo(req.user.id);

        await MultimodalAILoggingService.logMultimodalAICall({
          userId: req.user.id,
          userName: user.name || 'Unknown User',
          accountBookId: accountBookInfo.id,
          accountBookName: accountBookInfo.name,
          aiServiceType: 'speech',
          provider: speechConfig?.provider || 'unknown',
          model: speechConfig?.model || 'unknown',
          source: SourceDetectionUtil.detectSource(req),
          inputSize: req.file.size,
          inputFormat: req.file.mimetype,
          outputText: isSuccess ? (recognizedText || 'Speech recognition completed') : undefined,
          isSuccess,
          errorMessage,
          duration,
        });
      }
    }
  }

  /**
   * 图片识别
   * POST /api/ai/image-recognition
   */
  async imageRecognition(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    let isSuccess = false;
    let errorMessage: string | undefined;
    let visionConfig: any = null;
    let recognizedText: string | undefined;

    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: '用户未认证' });
        return;
      }

      // 获取视觉识别配置（用于日志记录）
      try {
        visionConfig = await this.configService.getVisionConfig();
      } catch (configError) {
        console.warn('获取视觉识别配置失败:', configError);
      }

      // 如果有文件上传，先保存到S3（带压缩）
      let processedImageFile: Express.Multer.File | undefined = req.file;
      if (req.file) {
        try {
          const uploadResult = await this.fileStorageService.uploadFile(
            req.file,
            {
              bucket: BUCKET_CONFIG.TEMP, // 使用临时存储桶
              category: 'multimodal',
              description: '图片识别',
              expiresIn: 3600, // 1小时后过期
            },
            userId
          );
          console.log(`图片已保存到S3: ${uploadResult.url}, 文件大小: ${uploadResult.size} bytes`);
        } catch (uploadError) {
          console.warn('保存图片到S3失败，使用原始文件进行识别:', uploadError);
          // 上传失败不影响识别流程，继续使用原始文件
        }
      }

      // 构建请求
      const visionRequest: VisionRecognitionRequest = {
        imageFile: processedImageFile,
        imageUrl: req.body.imageUrl,
        imageBase64: req.body.imageBase64,
        prompt: req.body.prompt,
        detailLevel: req.body.detailLevel,
      };

      // 验证输入
      if (!visionRequest.imageFile && !visionRequest.imageUrl && !visionRequest.imageBase64) {
        res.status(400).json({ success: false, error: '未提供图片数据' });
        return;
      }

      // 调用图片识别服务
      const result = await this.visionService.recognizeImage(visionRequest);

      isSuccess = result.success;
      if (!isSuccess) {
        errorMessage = result.error;
      } else {
        // 记录识别的文本内容
        recognizedText = result.data?.text;
      }

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          usage: result.usage,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          usage: result.usage,
        });
      }
    } catch (error) {
      isSuccess = false;
      errorMessage = error instanceof Error ? error.message : '图片识别服务暂时不可用';
      console.error('图片识别API错误:', error);
      res.status(500).json({
        success: false,
        error: '图片识别服务暂时不可用',
      });
    } finally {
      // 记录多模态AI调用日志
      if (req.user?.id) {
        const duration = Date.now() - startTime;
        const user = req.user as any;

        // 获取默认账本信息
        const accountBookInfo = await this.getDefaultAccountBookInfo(req.user.id);

        await MultimodalAILoggingService.logMultimodalAICall({
          userId: req.user.id,
          userName: user.name || 'Unknown User',
          accountBookId: accountBookInfo.id,
          accountBookName: accountBookInfo.name,
          aiServiceType: 'vision',
          provider: visionConfig?.provider || 'unknown',
          model: visionConfig?.model || 'unknown',
          source: SourceDetectionUtil.detectSource(req),
          inputSize: req.file?.size || 0,
          inputFormat: req.file?.mimetype || 'unknown',
          outputText: isSuccess ? (recognizedText || 'Image recognition completed') : undefined,
          isSuccess,
          errorMessage,
          duration,
        });
      }
    }
  }

  /**
   * 智能记账 - 语音识别
   * POST /api/ai/smart-accounting/speech
   */
  async smartAccountingSpeech(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    let isSuccess = false;
    let errorMessage: string | undefined;
    let speechConfig: any = null;
    let recognizedText: string | undefined;

    try {
      const userId = req.user?.id;
      const { accountBookId } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, error: '用户未认证' });
        return;
      }

      if (!accountBookId) {
        res.status(400).json({ success: false, error: '未提供账本ID' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ success: false, error: '未上传音频文件' });
        return;
      }

      // 检查记账点余额（语音记账消费2点）- 仅在记账点系统启用时检查
      if (this.membershipService.isAccountingPointsEnabled()) {
        const canUsePoints = await AccountingPointsService.canUsePoints(userId, AccountingPointsService.POINT_COSTS.voice);
        if (!canUsePoints) {
          res.status(402).json({
            success: false,
            error: '记账点余额不足，请进行签到获取记账点或开通捐赠会员',
            type: 'INSUFFICIENT_POINTS',
            required: AccountingPointsService.POINT_COSTS.voice
          });
          return;
        }
      }

      // 获取语音识别配置（用于日志记录）
      try {
        speechConfig = await this.configService.getSpeechConfig();
      } catch (configError) {
        console.warn('获取语音识别配置失败:', configError);
      }

      // 1. 语音转文本
      const speechRequest: SpeechRecognitionRequest = {
        audioFile: req.file,
        language: 'zh',
      };

      const speechResult = await this.speechService.speechToText(speechRequest);

      isSuccess = speechResult.success;
      if (!isSuccess) {
        errorMessage = speechResult.error;
        res.status(400).json({
          success: false,
          error: speechResult.error || '语音识别失败',
        });
        return;
      } else {
        // 记录识别的文本内容
        recognizedText = speechResult.data?.text;
      }

      // 2. 语音识别成功，扣除记账点（仅在记账点系统启用时）
      if (this.membershipService.isAccountingPointsEnabled()) {
        try {
          await AccountingPointsService.deductPoints(userId, 'voice', AccountingPointsService.POINT_COSTS.voice);
        } catch (pointsError) {
          console.error('扣除记账点失败:', pointsError);
          // 记账点扣除失败不影响返回结果，但需要记录日志
        }
      }

      // 3. 返回识别结果，前端将调用智能记账API
      res.json({
        success: true,
        data: {
          text: speechResult.data?.text || '',
          confidence: speechResult.data?.confidence || 0,
          type: 'speech',
        },
        usage: speechResult.usage,
      });
    } catch (error) {
      isSuccess = false;
      errorMessage = error instanceof Error ? error.message : '智能记账语音识别服务暂时不可用';
      console.error('智能记账语音识别API错误:', error);
      res.status(500).json({
        success: false,
        error: '智能记账语音识别服务暂时不可用',
      });
    } finally {
      // 记录多模态AI调用日志
      if (req.user?.id && req.file) {
        const duration = Date.now() - startTime;
        const user = req.user as any;

        // 获取账本信息
        let accountBookName: string | undefined;
        try {
          if (req.body.accountBookId) {
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            const accountBook = await prisma.accountBook.findUnique({
              where: { id: req.body.accountBookId },
              select: { name: true },
            });
            accountBookName = accountBook?.name;
            await prisma.$disconnect();
          }
        } catch (error) {
          console.warn('获取账本信息失败:', error);
        }

        await MultimodalAILoggingService.logMultimodalAICall({
          userId: req.user.id,
          userName: user.name || 'Unknown User',
          accountBookId: req.body.accountBookId,
          accountBookName,
          aiServiceType: 'speech',
          provider: speechConfig?.provider || 'unknown',
          model: speechConfig?.model || 'unknown',
          source: SourceDetectionUtil.detectSource(req),
          inputSize: req.file.size,
          inputFormat: req.file.mimetype,
          outputText: isSuccess ? (recognizedText || '智能记账语音识别完成') : undefined,
          isSuccess,
          errorMessage,
          duration,
        });
      }
    }
  }

  /**
   * 智能记账 - 图片识别
   * POST /api/ai/smart-accounting/vision
   */
  async smartAccountingVision(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    let isSuccess = false;
    let errorMessage: string | undefined;
    let visionConfig: any = null;
    let recognizedText: string | undefined;

    try {
      const userId = req.user?.id;
      const { accountBookId } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, error: '用户未认证' });
        return;
      }

      if (!accountBookId) {
        res.status(400).json({ success: false, error: '未提供账本ID' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ success: false, error: '未上传图片文件' });
        return;
      }

      // 检查记账点余额（图片记账消费3点）- 仅在记账点系统启用时检查
      if (this.membershipService.isAccountingPointsEnabled()) {
        const canUsePoints = await AccountingPointsService.canUsePoints(userId, AccountingPointsService.POINT_COSTS.image);
        if (!canUsePoints) {
          res.status(402).json({
            success: false,
            error: '记账点余额不足，请进行签到获取记账点或开通捐赠会员',
            type: 'INSUFFICIENT_POINTS',
            required: AccountingPointsService.POINT_COSTS.image
          });
          return;
        }
      }

      // 获取视觉识别配置（用于日志记录）
      try {
        visionConfig = await this.configService.getVisionConfig();
      } catch (configError) {
        console.warn('获取视觉识别配置失败:', configError);
      }

      // 1. 先保存图片到S3（带压缩）
      let savedImageFile: Express.Multer.File = req.file;
      try {
        const uploadResult = await this.fileStorageService.uploadFile(
          req.file,
          {
            bucket: BUCKET_CONFIG.TEMP, // 使用临时存储桶
            category: 'multimodal',
            description: '智能记账图片识别',
            expiresIn: 3600, // 1小时后过期
          },
          userId
        );
        console.log(`图片已保存到S3: ${uploadResult.url}, 文件大小: ${uploadResult.size} bytes`);
      } catch (uploadError) {
        console.warn('保存图片到S3失败，使用原始文件进行识别:', uploadError);
        // 上传失败不影响识别流程，继续使用原始文件
      }

      // 2. 获取配置的提示词
      const config = await this.configService.getFullConfig();
      const imageAnalysisPrompt = config.smartAccounting.imageAnalysisPrompt ||
        config.smartAccounting.multimodalPrompt ||
        '分析图片中的记账信息，提取：1.微信/支付宝付款记录：金额、收款人、备注，并从收款人分析记账类别；2.订单截图（美团/淘宝/京东/外卖/抖音）：内容、金额、时间、收件人；3.发票/票据：内容、分类、金额、时间。返回JSON格式。';

      // 3. 图片识别
      const visionRequest: VisionRecognitionRequest = {
        imageFile: savedImageFile,
        prompt: imageAnalysisPrompt,
        detailLevel: 'high',
      };

      const visionResult = await this.visionService.recognizeImage(visionRequest);

      isSuccess = visionResult.success;
      if (!isSuccess) {
        errorMessage = visionResult.error;
        res.status(400).json({
          success: false,
          error: visionResult.error || '图片识别失败',
        });
        return;
      } else {
        // 记录识别的文本内容
        recognizedText = visionResult.data?.text;
      }

      // 3. 图片识别成功，扣除记账点（仅在记账点系统启用时）
      if (this.membershipService.isAccountingPointsEnabled()) {
        try {
          await AccountingPointsService.deductPoints(userId, 'image', AccountingPointsService.POINT_COSTS.image);
        } catch (pointsError) {
          console.error('扣除记账点失败:', pointsError);
          // 记账点扣除失败不影响返回结果，但需要记录日志
        }
      }

      // 4. 返回识别结果，前端将调用智能记账API
      res.json({
        success: true,
        data: {
          text: visionResult.data?.text || '',
          confidence: visionResult.data?.confidence || 0,
          type: 'vision',
        },
        usage: visionResult.usage,
      });
    } catch (error) {
      isSuccess = false;
      errorMessage = error instanceof Error ? error.message : '智能记账图片识别服务暂时不可用';
      console.error('智能记账图片识别API错误:', error);
      res.status(500).json({
        success: false,
        error: '智能记账图片识别服务暂时不可用',
      });
    } finally {
      // 记录多模态AI调用日志
      if (req.user?.id && req.file) {
        const duration = Date.now() - startTime;
        const user = req.user as any;

        // 获取账本信息
        let accountBookName: string | undefined;
        try {
          if (req.body.accountBookId) {
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            const accountBook = await prisma.accountBook.findUnique({
              where: { id: req.body.accountBookId },
              select: { name: true },
            });
            accountBookName = accountBook?.name;
            await prisma.$disconnect();
          }
        } catch (error) {
          console.warn('获取账本信息失败:', error);
        }

        await MultimodalAILoggingService.logMultimodalAICall({
          userId: req.user.id,
          userName: user.name || 'Unknown User',
          accountBookId: req.body.accountBookId,
          accountBookName,
          aiServiceType: 'vision',
          provider: visionConfig?.provider || 'unknown',
          model: visionConfig?.model || 'unknown',
          source: SourceDetectionUtil.detectSource(req),
          inputSize: req.file.size,
          inputFormat: req.file.mimetype,
          outputText: isSuccess ? (recognizedText || '智能记账图片识别完成') : undefined,
          isSuccess,
          errorMessage,
          duration,
        });
      }
    }
  }

  /**
   * 获取多模态AI配置状态
   * GET /api/ai/multimodal/status
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const config = await this.configService.getFullConfig();
      
      res.json({
        success: true,
        data: {
          speech: {
            enabled: config.speech.enabled,
            provider: config.speech.provider,
            model: config.speech.model,
            supportedFormats: config.speech.allowedFormats,
            maxFileSize: config.speech.maxFileSize,
          },
          vision: {
            enabled: config.vision.enabled,
            provider: config.vision.provider,
            model: config.vision.model,
            supportedFormats: config.vision.allowedFormats,
            maxFileSize: config.vision.maxFileSize,
          },
        },
      });
    } catch (error) {
      console.error('获取多模态AI状态错误:', error);
      res.status(500).json({
        success: false,
        error: '获取状态失败',
      });
    }
  }

  /**
   * 测试连接
   * POST /api/ai/multimodal/test
   */
  async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.body; // 'speech' | 'vision'

      let result = false;

      if (type === 'speech') {
        result = await this.speechService.testConnection();
      } else if (type === 'vision') {
        result = await this.visionService.testConnection();
      } else {
        res.status(400).json({
          success: false,
          error: '无效的测试类型，支持: speech, vision',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          connected: result,
          type,
        },
      });
    } catch (error) {
      console.error('测试连接错误:', error);
      res.status(500).json({
        success: false,
        error: '测试连接失败',
      });
    }
  }
}
