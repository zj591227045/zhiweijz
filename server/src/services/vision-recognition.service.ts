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
import { VisionProviderManager } from '../ai/vision/vision-provider-manager';

/**
 * 视觉识别服务
 * 支持多个视觉识别提供商，包括硅基流动、火山方舟等
 */
export class VisionRecognitionService {
  private configService: MultimodalAIConfigService;
  private membershipService: MembershipService;
  private providerManager: VisionProviderManager;

  constructor() {
    this.configService = new MultimodalAIConfigService();
    this.membershipService = new MembershipService();
    this.providerManager = new VisionProviderManager();
  }

  /**
   * 图片识别（带记账点扣除）- 用于普通图片识别
   * @param request 图片识别请求
   * @param userId 用户ID（用于记账点扣除）
   */
  async recognizeImageWithStandalonePointsDeduction(request: VisionRecognitionRequest, userId: string): Promise<MultimodalAIResponse> {
    // 检查记账点余额（普通图片识别需要2点）- 仅在记账点系统启用时检查
    if (this.membershipService.isAccountingPointsEnabled()) {
      const canUsePoints = await AccountingPointsService.canUsePoints(userId, AccountingPointsService.POINT_COSTS.image);
      if (!canUsePoints) {
        return {
          success: false,
          error: '记账点余额不足，请进行签到获取记账点或开通捐赠会员，每天登录App以及签到总计可获得10点赠送记账点',
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
   * 图片识别（带记账点扣除）- 用于智能记账
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
          error: '记账点余额不足，请进行签到获取记账点或开通捐赠会员，每天登录App以及签到总计可获得10点赠送记账点',
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

      // 调用视觉识别API
      const result = await this.callVisionAPI(request, config);

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

      // 使用提供商管理器测试连接
      return await this.providerManager.testProviderConnection(visionConfig);
    } catch (error) {
      console.error('测试视觉识别连接失败:', error);
      return false;
    }
  }

  /**
   * 调用视觉识别API进行图片识别
   */
  private async callVisionAPI(
    request: VisionRecognitionRequest,
    config: VisionRecognitionConfig
  ): Promise<VisionRecognitionResponse> {
    try {
      // 使用提供商管理器进行识别
      return await this.providerManager.recognizeImage(request, config);
    } catch (error) {
      // 如果是已知的多模态AI错误，直接抛出
      if (error instanceof MultimodalAIError) {
        throw error;
      }

      // 其他错误转换为多模态AI错误
      console.error('视觉识别API调用失败:', error);
      throw new MultimodalAIError(
        MultimodalAIErrorType.API_ERROR,
        `视觉识别失败: ${error instanceof Error ? error.message : String(error)}`
      );
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
