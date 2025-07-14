import { Request, Response } from 'express';
import { SpeechRecognitionService } from '../services/speech-recognition.service';
import { VisionRecognitionService } from '../services/vision-recognition.service';
import { MultimodalAIConfigService } from '../services/multimodal-ai-config.service';
import { FileStorageService } from '../services/file-storage.service';
import AccountingPointsService from '../services/accounting-points.service';
import {
  SpeechRecognitionRequest,
  VisionRecognitionRequest,
  MultimodalAIError,
  MultimodalAIErrorType,
} from '../models/multimodal-ai.model';
import { BUCKET_CONFIG } from '../models/file-storage.model';

/**
 * 多模态AI控制器
 * 处理语音识别和视觉识别的API请求
 */
export class MultimodalAIController {
  private speechService: SpeechRecognitionService;
  private visionService: VisionRecognitionService;
  private configService: MultimodalAIConfigService;
  private fileStorageService: FileStorageService;

  constructor() {
    this.speechService = new SpeechRecognitionService();
    this.visionService = new VisionRecognitionService();
    this.configService = new MultimodalAIConfigService();
    this.fileStorageService = new FileStorageService();
  }

  /**
   * 语音转文本
   * POST /api/ai/speech-to-text
   */
  async speechToText(req: Request, res: Response): Promise<void> {
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

      // 构建请求
      const speechRequest: SpeechRecognitionRequest = {
        audioFile: req.file,
        language: req.body.language,
        format: req.body.format,
      };

      // 调用语音识别服务
      const result = await this.speechService.speechToText(speechRequest);

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
      console.error('语音转文本API错误:', error);
      res.status(500).json({
        success: false,
        error: '语音识别服务暂时不可用',
      });
    }
  }

  /**
   * 图片识别
   * POST /api/ai/image-recognition
   */
  async imageRecognition(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: '用户未认证' });
        return;
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
      console.error('图片识别API错误:', error);
      res.status(500).json({
        success: false,
        error: '图片识别服务暂时不可用',
      });
    }
  }

  /**
   * 智能记账 - 语音识别
   * POST /api/ai/smart-accounting/speech
   */
  async smartAccountingSpeech(req: Request, res: Response): Promise<void> {
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

      // 检查记账点余额（语音记账消费2点）
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

      // 1. 语音转文本
      const speechRequest: SpeechRecognitionRequest = {
        audioFile: req.file,
        language: 'zh',
      };

      const speechResult = await this.speechService.speechToText(speechRequest);

      if (!speechResult.success || !speechResult.data) {
        res.status(400).json({
          success: false,
          error: speechResult.error || '语音识别失败',
        });
        return;
      }

      // 2. 语音识别成功，扣除记账点
      try {
        await AccountingPointsService.deductPoints(userId, 'voice', AccountingPointsService.POINT_COSTS.voice);
      } catch (pointsError) {
        console.error('扣除记账点失败:', pointsError);
        // 记账点扣除失败不影响返回结果，但需要记录日志
      }

      // 3. 返回识别结果，前端将调用智能记账API
      res.json({
        success: true,
        data: {
          text: speechResult.data.text,
          confidence: speechResult.data.confidence,
          type: 'speech',
        },
        usage: speechResult.usage,
      });
    } catch (error) {
      console.error('智能记账语音识别API错误:', error);
      res.status(500).json({
        success: false,
        error: '智能记账语音识别服务暂时不可用',
      });
    }
  }

  /**
   * 智能记账 - 图片识别
   * POST /api/ai/smart-accounting/vision
   */
  async smartAccountingVision(req: Request, res: Response): Promise<void> {
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

      // 检查记账点余额（图片记账消费3点）
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
        '分析图片中的记账信息，提取：1.微信/支付宝付款记录：金额、收款人、备注，并从收款人分析交易类别；2.订单截图（美团/淘宝/京东/外卖/抖音）：内容、金额、时间、收件人；3.发票/票据：内容、分类、金额、时间。返回JSON格式。';

      // 3. 图片识别
      const visionRequest: VisionRecognitionRequest = {
        imageFile: savedImageFile,
        prompt: imageAnalysisPrompt,
        detailLevel: 'high',
      };

      const visionResult = await this.visionService.recognizeImage(visionRequest);

      if (!visionResult.success || !visionResult.data) {
        res.status(400).json({
          success: false,
          error: visionResult.error || '图片识别失败',
        });
        return;
      }

      // 3. 图片识别成功，扣除记账点
      try {
        await AccountingPointsService.deductPoints(userId, 'image', AccountingPointsService.POINT_COSTS.image);
      } catch (pointsError) {
        console.error('扣除记账点失败:', pointsError);
        // 记账点扣除失败不影响返回结果，但需要记录日志
      }

      // 4. 返回识别结果，前端将调用智能记账API
      res.json({
        success: true,
        data: {
          text: visionResult.data.text,
          confidence: visionResult.data.confidence,
          type: 'vision',
        },
        usage: visionResult.usage,
      });
    } catch (error) {
      console.error('智能记账图片识别API错误:', error);
      res.status(500).json({
        success: false,
        error: '智能记账图片识别服务暂时不可用',
      });
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
          general: {
            enabled: config.general.enabled,
            dailyLimit: config.general.dailyLimit,
            userLimit: config.general.userLimit,
          },
          smartAccounting: {
            speechEnabled: config.smartAccounting.speechEnabled,
            visionEnabled: config.smartAccounting.visionEnabled,
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
