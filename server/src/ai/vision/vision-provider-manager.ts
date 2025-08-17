import { VisionProvider } from './vision-provider';
import { VolcengineVisionProvider } from './volcengine-vision-provider';
import { SiliconFlowVisionProvider } from './siliconflow-vision-provider';
import {
  VisionRecognitionRequest,
  VisionRecognitionResponse,
  VisionRecognitionConfig,
} from '../../models/multimodal-ai.model';

/**
 * 视觉识别提供商管理器
 * 管理多个视觉识别提供商，支持动态切换
 */
export class VisionProviderManager {
  private providers: Map<string, VisionProvider> = new Map();

  constructor() {
    this.registerProviders();
  }

  /**
   * 注册所有提供商
   */
  private registerProviders() {
    // 注册硅基流动提供商
    this.providers.set('siliconflow', new SiliconFlowVisionProvider());
    
    // 注册火山方舟提供商
    this.providers.set('volcengine', new VolcengineVisionProvider());
  }

  /**
   * 获取提供商
   * @param providerName 提供商名称
   * @returns 提供商实例
   */
  public getProvider(providerName: string): VisionProvider | null {
    return this.providers.get(providerName) || null;
  }

  /**
   * 获取所有提供商名称
   * @returns 提供商名称列表
   */
  public getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * 识别图片（使用指定提供商）
   * @param request 视觉识别请求
   * @param config 配置
   * @returns 识别结果
   */
  public async recognizeImage(
    request: VisionRecognitionRequest,
    config: VisionRecognitionConfig,
  ): Promise<VisionRecognitionResponse> {
    const provider = this.getProvider(config.provider);
    
    if (!provider) {
      throw new Error(`不支持的视觉识别提供商: ${config.provider}`);
    }

    // 验证配置
    if (!provider.validateConfig(config)) {
      throw new Error(`提供商 ${config.provider} 的配置无效`);
    }

    // 转换配置为提供商选项
    const options = {
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      detailLevel: config.detailLevel,
    };

    return await provider.recognizeImage(request, options);
  }

  /**
   * 测试提供商连接
   * @param config 配置
   * @returns 是否连接成功
   */
  public async testProviderConnection(config: VisionRecognitionConfig): Promise<boolean> {
    try {
      const provider = this.getProvider(config.provider);
      
      if (!provider) {
        return false;
      }

      // 验证配置
      if (!provider.validateConfig(config)) {
        return false;
      }

      // 创建测试请求 - 使用火山方舟官方示例图片URL
      const testRequest: VisionRecognitionRequest = {
        imageUrl: 'https://ark-project.tos-cn-beijing.ivolces.com/images/view.jpeg',
        prompt: '这是一个测试图片，请简单描述。',
      };

      const options = {
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl,
        timeout: config.timeout || 30,
        detailLevel: config.detailLevel || 'auto',
      };

      await provider.recognizeImage(testRequest, options);
      return true;
    } catch (error) {
      console.error(`测试提供商 ${config.provider} 连接失败:`, error);
      return false;
    }
  }

  /**
   * 获取提供商的默认配置
   * @param providerName 提供商名称
   * @returns 默认配置
   */
  public getProviderDefaultConfig(providerName: string): Partial<VisionRecognitionConfig> | null {
    const provider = this.getProvider(providerName);
    return provider ? provider.getDefaultConfig() : null;
  }

  /**
   * 获取提供商支持的模型列表
   * @param providerName 提供商名称
   * @returns 支持的模型列表
   */
  public getProviderSupportedModels(providerName: string): string[] {
    const provider = this.getProvider(providerName);
    return provider ? provider.getSupportedModels() : [];
  }

  /**
   * 获取所有提供商信息
   * @returns 提供商信息列表
   */
  public getAllProvidersInfo(): Array<{
    name: string;
    displayName: string;
    supportedModels: string[];
    defaultConfig: Partial<VisionRecognitionConfig>;
  }> {
    const providersInfo: Array<{
      name: string;
      displayName: string;
      supportedModels: string[];
      defaultConfig: Partial<VisionRecognitionConfig>;
    }> = [];

    for (const [name, provider] of this.providers) {
      const displayNames: Record<string, string> = {
        siliconflow: '硅基流动',
        volcengine: '火山方舟',
      };

      providersInfo.push({
        name,
        displayName: displayNames[name] || name,
        supportedModels: provider.getSupportedModels(),
        defaultConfig: provider.getDefaultConfig(),
      });
    }

    return providersInfo;
  }
}
