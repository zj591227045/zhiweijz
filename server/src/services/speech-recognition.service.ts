import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';
import {
  SpeechRecognitionRequest,
  SpeechRecognitionResponse,
  MultimodalAIResponse,
  MultimodalAIError,
  MultimodalAIErrorType,
  SpeechRecognitionConfig,
} from '../models/multimodal-ai.model';
import { MultimodalAIConfigService } from './multimodal-ai-config.service';
import { BaiduSpeechRecognitionService } from './speech-recognition-baidu.service';
import AccountingPointsService from './accounting-points.service';
import { MembershipService } from './membership.service';

/**
 * 语音识别服务
 * 支持多种语音识别提供商
 */
export class SpeechRecognitionService {
  private configService: MultimodalAIConfigService;
  private baiduService: BaiduSpeechRecognitionService;
  private membershipService: MembershipService;

  constructor() {
    this.configService = new MultimodalAIConfigService();
    this.baiduService = new BaiduSpeechRecognitionService();
    this.membershipService = new MembershipService();
  }

  /**
   * 语音转文本（带记账点扣除）- 用于普通语音识别
   * @param request 语音识别请求
   * @param userId 用户ID（用于记账点扣除）
   */
  async speechToTextWithStandalonePointsDeduction(request: SpeechRecognitionRequest, userId: string): Promise<MultimodalAIResponse> {
    // 检查记账点余额（普通语音识别需要1点）- 仅在记账点系统启用时检查
    if (this.membershipService.isAccountingPointsEnabled()) {
      const canUsePoints = await AccountingPointsService.canUsePoints(userId, AccountingPointsService.POINT_COSTS.voice);
      if (!canUsePoints) {
        return {
          success: false,
          error: '记账点余额不足，请进行签到获取记账点或开通捐赠会员',
          usage: { duration: 0 },
        };
      }
    }

    // 调用原始的语音识别方法
    const result = await this.speechToText(request);

    // 如果识别成功，扣除语音识别记账点（1点）- 仅在记账点系统启用时
    if (result.success && this.membershipService.isAccountingPointsEnabled()) {
      try {
        await AccountingPointsService.deductPoints(userId, 'voice', AccountingPointsService.POINT_COSTS.voice);
      } catch (pointsError) {
        console.error('扣除记账点失败:', pointsError);
        // 记账点扣除失败不影响返回结果，但需要记录日志
      }
    }

    return result;
  }

  /**
   * 语音转文本（带记账点扣除）- 用于智能记账
   * @param request 语音识别请求
   * @param userId 用户ID（用于记账点扣除）
   */
  async speechToTextWithPointsDeduction(request: SpeechRecognitionRequest, userId: string): Promise<MultimodalAIResponse> {
    // 检查记账点余额（语音智能记账总共需要2点：语音识别1点+智能记账1点）- 仅在记账点系统启用时检查
    if (this.membershipService.isAccountingPointsEnabled()) {
      const totalRequiredPoints = AccountingPointsService.POINT_COSTS.voice + AccountingPointsService.POINT_COSTS.text;
      const canUsePoints = await AccountingPointsService.canUsePoints(userId, totalRequiredPoints);
      if (!canUsePoints) {
        return {
          success: false,
          error: '记账点余额不足，请进行签到获取记账点或开通捐赠会员',
          usage: { duration: 0 },
        };
      }
    }

    // 调用原始的语音识别方法
    const result = await this.speechToText(request);

    // 如果识别成功，扣除语音识别记账点（1点）- 仅在记账点系统启用时
    if (result.success && this.membershipService.isAccountingPointsEnabled()) {
      try {
        await AccountingPointsService.deductPoints(userId, 'voice', AccountingPointsService.POINT_COSTS.voice);
      } catch (pointsError) {
        console.error('扣除记账点失败:', pointsError);
        // 记账点扣除失败不影响返回结果，但需要记录日志
      }
    }

    return result;
  }

  /**
   * 语音转文本（原始方法，不扣除记账点）
   */
  async speechToText(request: SpeechRecognitionRequest): Promise<MultimodalAIResponse> {
    const startTime = Date.now();

    try {
      // 获取配置
      const config = await this.configService.getSpeechConfig();
      
      // 检查功能是否启用
      if (!config.enabled) {
        throw new MultimodalAIError(
          MultimodalAIErrorType.INVALID_CONFIG,
          '语音识别功能未启用'
        );
      }

      // 验证配置
      this.validateConfig(config);

      // 验证文件
      this.validateAudioFile(request.audioFile, config);

      // 根据提供商选择对应的服务
      let result: MultimodalAIResponse;
      
      switch (config.provider) {
        case 'baidu':
          result = await this.baiduService.speechToText(request, config);
          break;
        case 'siliconflow':
        default:
          result = await this.callSiliconFlowAPI(request, config);
          break;
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof MultimodalAIError) {
        return {
          success: false,
          error: error.message,
          usage: { duration },
        };
      }

      console.error('语音识别失败:', error);
      return {
        success: false,
        error: '语音识别服务暂时不可用',
        usage: { duration },
      };
    }
  }

  /**
   * 测试语音识别服务连接
   */
  async testConnection(config?: Partial<SpeechRecognitionConfig>): Promise<boolean> {
    try {
      const speechConfig = config 
        ? { ...await this.configService.getSpeechConfig(), ...config }
        : await this.configService.getSpeechConfig();

      if (!speechConfig.enabled) {
        return false;
      }

      // 根据提供商选择对应的测试方法
      switch (speechConfig.provider) {
        case 'baidu':
          return await this.baiduService.testConnection(speechConfig);
        case 'siliconflow':
        default:
          return await this.testSiliconFlowConnection(speechConfig);
      }
    } catch (error) {
      console.error('测试语音识别连接失败:', error);
      return false;
    }
  }

  /**
   * 测试硅基流动连接
   */
  private async testSiliconFlowConnection(config: SpeechRecognitionConfig): Promise<boolean> {
    try {
      if (!config.apiKey) {
        return false;
      }

      // 测试API连接 - 调用模型列表接口
      const response = await axios.get(`${config.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      return response.status === 200;
    } catch (error) {
      console.error('测试硅基流动连接失败:', error);
      return false;
    }
  }

  /**
   * 调用硅基流动语音转文本API
   */
  private async callSiliconFlowAPI(
    request: SpeechRecognitionRequest,
    config: SpeechRecognitionConfig
  ): Promise<MultimodalAIResponse> {
    const startTime = Date.now();

    try {
      // 创建FormData
      const formData = new FormData();
      
      // 添加模型参数
      formData.append('model', config.model);
      
      // 添加音频文件
      const audioBuffer = request.audioFile.buffer;
      const audioStream = Readable.from(audioBuffer);
      formData.append('file', audioStream, {
        filename: request.audioFile.originalname,
        contentType: request.audioFile.mimetype,
      });

      // 添加可选参数
      if (request.language) {
        formData.append('language', request.language);
      }

      // 调用API
      const response = await axios.post(
        `${config.baseUrl}/audio/transcriptions`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            ...formData.getHeaders(),
          },
          timeout: config.timeout * 1000,
          maxContentLength: config.maxFileSize,
          maxBodyLength: config.maxFileSize,
        }
      );

      // 解析响应
      const data = response.data;
      
      if (!data || !data.text) {
        throw new MultimodalAIError(
          MultimodalAIErrorType.API_ERROR,
          'API返回的响应格式不正确'
        );
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        data: {
          text: data.text,
          confidence: data.confidence,
          duration: data.duration,
          language: data.language || request.language,
        },
        usage: {
          duration,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new MultimodalAIError(
            MultimodalAIErrorType.TIMEOUT,
            '语音识别请求超时'
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
            '音频文件过大'
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
  private validateConfig(config: SpeechRecognitionConfig): void {
    if (config.provider === 'baidu') {
      // 百度云配置验证由 BaiduSpeechRecognitionService 处理
      return;
    }

    if (!config.apiKey) {
      throw new MultimodalAIError(
        MultimodalAIErrorType.INVALID_CONFIG,
        '语音识别API密钥未配置'
      );
    }

    if (!config.baseUrl) {
      throw new MultimodalAIError(
        MultimodalAIErrorType.INVALID_CONFIG,
        '语音识别API地址未配置'
      );
    }

    if (!config.model) {
      throw new MultimodalAIError(
        MultimodalAIErrorType.INVALID_CONFIG,
        '语音识别模型未配置'
      );
    }
  }

  /**
   * 验证音频文件
   */
  private validateAudioFile(file: Express.Multer.File, config: SpeechRecognitionConfig): void {
    if (!file) {
      throw new MultimodalAIError(
        MultimodalAIErrorType.PROCESSING_ERROR,
        '未提供音频文件'
      );
    }

    // 检查文件大小
    if (file.size > config.maxFileSize) {
      throw new MultimodalAIError(
        MultimodalAIErrorType.FILE_TOO_LARGE,
        `音频文件大小超过限制 (${config.maxFileSize} 字节)`
      );
    }

    // 对于百度云服务，格式验证由 BaiduSpeechRecognitionService 自行处理
    if (config.provider === 'baidu') {
      return;
    }

    // 对于其他服务，使用通用格式验证
    const fileExtension = this.getFileExtension(file.originalname);
    if (!config.allowedFormats.includes(fileExtension)) {
      throw new MultimodalAIError(
        MultimodalAIErrorType.UNSUPPORTED_FORMAT,
        `不支持的音频格式: ${fileExtension}。支持的格式: ${config.allowedFormats.join(', ')}`
      );
    }

    // 检查MIME类型
    if (!file.mimetype.startsWith('audio/')) {
      throw new MultimodalAIError(
        MultimodalAIErrorType.UNSUPPORTED_FORMAT,
        '文件不是有效的音频格式'
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
   * 获取支持的音频格式
   */
  async getSupportedFormats(): Promise<string[]> {
    const config = await this.configService.getSpeechConfig();
    return config.allowedFormats;
  }

  /**
   * 获取最大文件大小
   */
  async getMaxFileSize(): Promise<number> {
    const config = await this.configService.getSpeechConfig();
    return config.maxFileSize;
  }
}
