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
 * 火山方舟视觉识别提供商实现
 * 支持豆包大模型的视觉识别功能
 */
export class VolcengineVisionProvider implements VisionProvider {
  /** 提供商名称 */
  public name = 'volcengine';

  /** 默认基础URL */
  private readonly defaultBaseUrl = 'https://ark.cn-beijing.volces.com/api/v3';

  /** 支持的视觉模型列表 */
  private readonly supportedModels = [
    'ep-20250112212411-2kbkh', // 用户实际使用的模型ID
    'ep-20241217-vision-1', // 豆包视觉模型 (示例接入点ID)
    'ep-20241217-vision-2', // 豆包多模态模型 (示例接入点ID)
    'ep-20241217-vision-3', // 豆包图像理解模型 (示例接入点ID)
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

      // 构建消息内容 - 使用火山方舟官方格式
      const messages = [
        {
          role: 'user',
          content: [
            {
              image_url: {
                url: imageContent,
              },
              type: 'image_url',
            },
            {
              text: request.prompt || '请详细描述这张图片的内容，包括其中的文字、物品、场景等信息。',
              type: 'text',
            },
          ],
        },
      ];

      // 确保baseUrl格式正确
      const cleanBaseUrl = options.baseUrl.endsWith('/') ? options.baseUrl.slice(0, -1) : options.baseUrl;
      const apiUrl = `${cleanBaseUrl}/chat/completions`;

      console.log(`火山方舟API调用详情:`, {
        url: apiUrl,
        model: options.model,
        hasApiKey: !!options.apiKey,
        apiKeyPrefix: options.apiKey ? options.apiKey.substring(0, 10) + '...' : 'none'
      });

      // 调用火山方舟API
      const response = await axios.post(
        apiUrl,
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
            'Accept': 'application/json',
            'Accept-Encoding': 'identity', // 禁用压缩，避免header check错误
          },
          timeout: (options.timeout || 30) * 1000,
          decompress: false, // 禁用自动解压缩
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
        confidence: 0.9, // 火山方舟API暂不返回置信度，使用默认值
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('火山方舟API调用失败详情:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers ? {
            ...error.config.headers,
            Authorization: error.config.headers.Authorization ? '[HIDDEN]' : undefined
          } : undefined
        });

        if (error.code === 'ECONNABORTED') {
          throw new MultimodalAIError(
            MultimodalAIErrorType.TIMEOUT,
            '图片识别请求超时'
          );
        }

        if (error.response?.status === 404) {
          throw new MultimodalAIError(
            MultimodalAIErrorType.API_ERROR,
            `模型不存在或无权访问: ${options.model}。请检查模型ID是否正确，以及API密钥是否有权限访问该模型。`
          );
        }

        if (error.response?.status === 401) {
          throw new MultimodalAIError(
            MultimodalAIErrorType.API_ERROR,
            'API密钥无效或已过期，请检查火山方舟API密钥配置'
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

        // 提供更详细的错误信息
        const errorMessage = error.response?.data?.error?.message ||
                           error.response?.data?.message ||
                           error.message;

        throw new MultimodalAIError(
          MultimodalAIErrorType.API_ERROR,
          `火山方舟API调用失败 (${error.response?.status || 'UNKNOWN'}): ${errorMessage}`
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
      console.error('火山方舟配置验证失败: API密钥为空');
      return false;
    }

    if (!config.model || config.model.trim() === '') {
      console.error('火山方舟配置验证失败: 模型ID为空');
      return false;
    }

    if (!config.baseUrl || config.baseUrl.trim() === '') {
      console.error('火山方舟配置验证失败: 基础URL为空');
      return false;
    }

    // 验证baseUrl格式
    try {
      new URL(config.baseUrl);
    } catch (error) {
      console.error('火山方舟配置验证失败: 基础URL格式无效', config.baseUrl);
      return false;
    }

    // 验证模型ID格式（火山方舟的接入点ID通常以ep-开头）
    if (!config.model.startsWith('ep-')) {
      console.warn(`火山方舟模型ID格式可能不正确: ${config.model}，通常应以 'ep-' 开头`);
    }

    // 移除模型名称限制，允许任何有效的接入点ID
    // 火山方舟的模型名称是动态的接入点ID，不需要预设限制
    console.log(`火山方舟视觉识别使用模型: ${config.model}`);

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
      provider: 'volcengine',
      model: 'ep-20250112212411-2kbkh', // 使用用户提供的实际模型ID
      baseUrl: this.defaultBaseUrl,
      timeout: 30,
      detailLevel: 'auto',
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
    // 火山方舟API密钥格式验证
    return !!(apiKey && apiKey.length > 10);
  }

  /**
   * 获取健康检查URL
   * @param baseUrl 基础URL
   * @returns 健康检查URL
   */
  public getHealthCheckUrl(baseUrl: string): string {
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBaseUrl}/chat/completions`;
  }
}
