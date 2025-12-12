import { logger } from '../../utils/logger';
import axios from 'axios';
import {
  VisionProvider,
  VisionProviderOptions,
} from './vision-provider';
import {
  VisionRecognitionRequest,
  VisionRecognitionResponse,
  VisionRecognitionConfig,
  MultimodalAIError,
  MultimodalAIErrorType,
} from '../../models/multimodal-ai.model';

/**
 * 硅基流动视觉识别提供商实现
 * 支持硅基流动平台的视觉识别功能
 */
export class SiliconFlowVisionProvider implements VisionProvider {
  /** 提供商名称 */
  public name = 'siliconflow';

  /** 默认基础URL */
  private readonly defaultBaseUrl = 'https://api.siliconflow.cn/v1';

  /** 支持的视觉模型列表 */
  private readonly supportedModels = [
    'Qwen/Qwen2.5-VL-72B-Instruct',
    'Qwen/Qwen2-VL-72B-Instruct',
    'Qwen/Qwen2-VL-7B-Instruct',
    'deepseek-ai/deepseek-vl-7b-chat',
    'OpenGVLab/InternVL2-26B',
    'OpenGVLab/InternVL2-8B',
  ];

  /**
   * 识别图片
   * @param request 视觉识别请求
   * @param options 提供商选项
   * @returns 识别结果
   */
  public async recognizeImage(
    request: VisionRecognitionRequest,
    options: VisionProviderOptions,
  ): Promise<VisionRecognitionResponse> {
    try {
      // 准备图片内容
      const imageContent = await this.prepareImageContent(request);

      // 构建消息内容
      const messages = [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageContent,
                detail: options.detailLevel || 'high',
              },
            },
            {
              type: 'text',
              text: request.prompt || '请详细描述这张图片的内容，包括其中的文字、物品、场景等信息。',
            },
          ],
        },
      ];

      // 调用硅基流动API
      const response = await axios.post(
        `${options.baseUrl}/chat/completions`,
        {
          model: options.model,
          messages,
          max_tokens: 1000,
          temperature: 0.1,
        },
        {
          headers: {
            'Authorization': `Bearer ${options.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: (options.timeout || 60) * 1000,
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
          `硅基流动API调用失败: ${error.response?.data?.message || error.message}`
        );
      }

      throw error;
    }
  }

  /**
   * 准备图片内容
   * @param request 视觉识别请求
   * @returns 图片内容（base64或URL）
   */
  private async prepareImageContent(request: VisionRecognitionRequest): Promise<string> {
    if (request.imageBase64) {
      // 如果已经是base64格式，直接使用
      return request.imageBase64.startsWith('data:') 
        ? request.imageBase64 
        : `data:image/jpeg;base64,${request.imageBase64}`;
    }

    if (request.imageUrl) {
      // 如果是URL，直接返回
      return request.imageUrl;
    }

    if (request.imageFile) {
      // 如果是文件，转换为base64
      const buffer = request.imageFile.buffer;
      const base64 = buffer.toString('base64');
      const mimeType = request.imageFile.mimetype || 'image/jpeg';
      return `data:${mimeType};base64,${base64}`;
    }

    throw new MultimodalAIError(
      MultimodalAIErrorType.PROCESSING_ERROR,
      '未提供有效的图片数据'
    );
  }

  /**
   * 验证配置
   * @param config 配置对象
   * @returns 是否有效
   */
  public validateConfig(config: VisionRecognitionConfig): boolean {
    if (!config.apiKey || config.apiKey.trim() === '') {
      return false;
    }

    if (!config.model || config.model.trim() === '') {
      return false;
    }

    if (!config.baseUrl || config.baseUrl.trim() === '') {
      return false;
    }

    // 移除严格的模型名称限制，允许用户使用任何模型
    // 只记录使用的模型名称，不强制验证
    logger.info(`硅基流动视觉识别使用模型: ${config.model}`);

    return true;
  }

  /**
   * 获取支持的模型列表
   * @returns 支持的模型列表
   */
  public getSupportedModels(): string[] {
    return [...this.supportedModels];
  }

  /**
   * 获取默认配置
   * @returns 默认配置
   */
  public getDefaultConfig(): Partial<VisionRecognitionConfig> {
    return {
      provider: 'siliconflow',
      model: this.supportedModels[0],
      baseUrl: this.defaultBaseUrl,
      timeout: 60,
      detailLevel: 'high',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
    };
  }

  /**
   * 验证API密钥格式
   * @param apiKey API密钥
   * @returns 是否有效
   */
  public validateApiKey(apiKey: string): boolean {
    // 硅基流动API密钥格式验证
    return !!(apiKey && apiKey.length > 10);
  }

  /**
   * 获取健康检查URL
   * @param baseUrl 基础URL
   * @returns 健康检查URL
   */
  public getHealthCheckUrl(baseUrl: string): string {
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBaseUrl}/models`;
  }
}
