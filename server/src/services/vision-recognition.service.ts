import axios from 'axios';
import {
  VisionRecognitionRequest,
  VisionRecognitionResponse,
  MultimodalAIResponse,
  MultimodalAIError,
  MultimodalAIErrorType,
  VisionRecognitionConfig,
} from '../models/multimodal-ai.model';
import { MultimodalAIConfigService } from './multimodal-ai-config.service';
import AccountingPointsService from './accounting-points.service';
import { MembershipService } from './membership.service';

/**
 * 视觉识别服务
 * 基于硅基流动视觉模型API实现图片识别功能
 */
export class VisionRecognitionService {
  private configService: MultimodalAIConfigService;
  private membershipService: MembershipService;

  constructor() {
    this.configService = new MultimodalAIConfigService();
    this.membershipService = new MembershipService();
  }

  /**
   * 图片识别（带记账点扣除）
   * @param request 图片识别请求
   * @param userId 用户ID（用于记账点扣除）
   */
  async recognizeImageWithPointsDeduction(request: VisionRecognitionRequest, userId: string): Promise<MultimodalAIResponse> {
    // 检查记账点余额（图片智能记账总共需要3点：图片识别2点+智能记账1点）- 仅在记账点系统启用时检查
    if (this.membershipService.isAccountingPointsEnabled()) {
      const totalRequiredPoints = AccountingPointsService.POINT_COSTS.image + AccountingPointsService.POINT_COSTS.text;
      const canUsePoints = await AccountingPointsService.canUsePoints(userId, totalRequiredPoints);
      if (!canUsePoints) {
        return {
          success: false,
          error: '记账点余额不足，请进行签到获取记账点或开通捐赠会员',
          usage: { duration: 0 },
        };
      }
    }

    // 调用原始的图片识别方法
    const result = await this.recognizeImage(request);

    // 如果识别成功，扣除图片识别记账点（2点）- 仅在记账点系统启用时
    if (result.success && this.membershipService.isAccountingPointsEnabled()) {
      try {
        await AccountingPointsService.deductPoints(userId, 'image', AccountingPointsService.POINT_COSTS.image);
      } catch (pointsError) {
        console.error('扣除记账点失败:', pointsError);
        // 记账点扣除失败不影响返回结果，但需要记录日志
      }
    }

    return result;
  }

  /**
   * 图片识别（原始方法，不扣除记账点）
   */
  async recognizeImage(request: VisionRecognitionRequest): Promise<MultimodalAIResponse> {
    const startTime = Date.now();

    try {
      // 获取配置
      const config = await this.configService.getVisionConfig();
      
      // 检查功能是否启用
      if (!config.enabled) {
        throw new MultimodalAIError(
          MultimodalAIErrorType.INVALID_CONFIG,
          '视觉识别功能未启用'
        );
      }

      // 验证配置
      this.validateConfig(config);

      // 验证输入
      this.validateRequest(request, config);

      // 调用硅基流动API
      const result = await this.callSiliconFlowAPI(request, config);

      const duration = Date.now() - startTime;

      return {
        success: true,
        data: result,
        usage: {
          duration,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof MultimodalAIError) {
        return {
          success: false,
          error: error.message,
          usage: { duration },
        };
      }

      console.error('图片识别失败:', error);
      return {
        success: false,
        error: '图片识别服务暂时不可用',
        usage: { duration },
      };
    }
  }

  /**
   * 测试视觉识别服务连接
   */
  async testConnection(config?: Partial<VisionRecognitionConfig>): Promise<boolean> {
    try {
      const visionConfig = config 
        ? { ...await this.configService.getVisionConfig(), ...config }
        : await this.configService.getVisionConfig();

      if (!visionConfig.enabled || !visionConfig.apiKey) {
        return false;
      }

      // 测试API连接 - 调用模型列表接口
      const response = await axios.get(`${visionConfig.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${visionConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      return response.status === 200;
    } catch (error) {
      console.error('测试视觉识别连接失败:', error);
      return false;
    }
  }

  /**
   * 调用硅基流动视觉模型API
   */
  private async callSiliconFlowAPI(
    request: VisionRecognitionRequest,
    config: VisionRecognitionConfig
  ): Promise<VisionRecognitionResponse> {
    try {
      // 准备图片数据
      let imageContent: string;
      
      if (request.imageFile) {
        // 文件上传方式
        const base64 = request.imageFile.buffer.toString('base64');
        imageContent = `data:${request.imageFile.mimetype};base64,${base64}`;
      } else if (request.imageBase64) {
        // Base64方式
        imageContent = request.imageBase64.startsWith('data:') 
          ? request.imageBase64 
          : `data:image/jpeg;base64,${request.imageBase64}`;
      } else if (request.imageUrl) {
        // URL方式
        imageContent = request.imageUrl;
      } else {
        throw new MultimodalAIError(
          MultimodalAIErrorType.PROCESSING_ERROR,
          '未提供有效的图片数据'
        );
      }

      // 构建消息内容
      const messages = [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageContent,
                detail: request.detailLevel || config.detailLevel,
              },
            },
            {
              type: 'text',
              text: request.prompt || '请详细描述这张图片的内容，包括其中的文字、物品、场景等信息。',
            },
          ],
        },
      ];

      // 调用API
      const response = await axios.post(
        `${config.baseUrl}/chat/completions`,
        {
          model: config.model,
          messages,
          max_tokens: 1000,
          temperature: 0.1,
        },
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: config.timeout * 1000,
        }
      );

      // 解析响应
      const data = response.data;
      
      if (!data || !data.choices || data.choices.length === 0) {
        throw new MultimodalAIError(
          MultimodalAIErrorType.API_ERROR,
          'API返回的响应格式不正确'
        );
      }

      const content = data.choices[0].message?.content;
      if (!content) {
        throw new MultimodalAIError(
          MultimodalAIErrorType.API_ERROR,
          'API未返回识别结果'
        );
      }

      return {
        text: content,
        confidence: 0.9, // 硅基流动API暂不返回置信度，使用默认值
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new MultimodalAIError(
            MultimodalAIErrorType.TIMEOUT,
            '图片识别请求超时'
          );
        }
        
        if (error.response?.status === 429) {
          throw new MultimodalAIError(
            MultimodalAIErrorType.QUOTA_EXCEEDED,
            'API调用频率限制'
          );
        }

        if (error.response?.status === 413) {
          throw new MultimodalAIError(
            MultimodalAIErrorType.FILE_TOO_LARGE,
            '图片文件过大'
          );
        }

        throw new MultimodalAIError(
          MultimodalAIErrorType.API_ERROR,
          `API调用失败: ${error.response?.data?.message || error.message}`
        );
      }

      throw error;
    }
  }

  /**
   * 验证配置
   */
  private validateConfig(config: VisionRecognitionConfig): void {
    if (!config.apiKey) {
      throw new MultimodalAIError(
        MultimodalAIErrorType.INVALID_CONFIG,
        '视觉识别API密钥未配置'
      );
    }

    if (!config.baseUrl) {
      throw new MultimodalAIError(
        MultimodalAIErrorType.INVALID_CONFIG,
        '视觉识别API地址未配置'
      );
    }

    if (!config.model) {
      throw new MultimodalAIError(
        MultimodalAIErrorType.INVALID_CONFIG,
        '视觉识别模型未配置'
      );
    }
  }

  /**
   * 验证请求
   */
  private validateRequest(request: VisionRecognitionRequest, config: VisionRecognitionConfig): void {
    // 检查是否提供了图片数据
    if (!request.imageFile && !request.imageUrl && !request.imageBase64) {
      throw new MultimodalAIError(
        MultimodalAIErrorType.PROCESSING_ERROR,
        '未提供图片数据'
      );
    }

    // 验证文件（如果是文件上传）
    if (request.imageFile) {
      this.validateImageFile(request.imageFile, config);
    }
  }

  /**
   * 验证图片文件
   */
  private validateImageFile(file: Express.Multer.File, config: VisionRecognitionConfig): void {
    // 检查文件大小
    if (file.size > config.maxFileSize) {
      throw new MultimodalAIError(
        MultimodalAIErrorType.FILE_TOO_LARGE,
        `图片文件大小超过限制 (${config.maxFileSize} 字节)`
      );
    }

    // 检查文件格式
    const fileExtension = this.getFileExtension(file.originalname);
    if (!config.allowedFormats.includes(fileExtension)) {
      throw new MultimodalAIError(
        MultimodalAIErrorType.UNSUPPORTED_FORMAT,
        `不支持的图片格式: ${fileExtension}。支持的格式: ${config.allowedFormats.join(', ')}`
      );
    }

    // 检查MIME类型
    if (!file.mimetype.startsWith('image/')) {
      throw new MultimodalAIError(
        MultimodalAIErrorType.UNSUPPORTED_FORMAT,
        '文件不是有效的图片格式'
      );
    }
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * 获取支持的图片格式
   */
  async getSupportedFormats(): Promise<string[]> {
    const config = await this.configService.getVisionConfig();
    return config.allowedFormats;
  }

  /**
   * 获取最大文件大小
   */
  async getMaxFileSize(): Promise<number> {
    const config = await this.configService.getVisionConfig();
    return config.maxFileSize;
  }
}
