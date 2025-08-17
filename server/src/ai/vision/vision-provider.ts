import {
  VisionRecognitionRequest,
  VisionRecognitionResponse,
  VisionRecognitionConfig,
} from '../../models/multimodal-ai.model';

/**
 * 视觉识别提供商选项接口
 */
export interface VisionProviderOptions {
  /** API密钥 */
  apiKey: string;
  /** 模型名称 */
  model: string;
  /** 基础URL */
  baseUrl: string;
  /** 超时时间(秒) */
  timeout?: number;
  /** 详细级别 */
  detailLevel?: 'low' | 'high' | 'auto';
  /** 其他可选参数 */
  [key: string]: any;
}

/**
 * 视觉识别提供商接口
 * 定义了所有视觉识别提供商必须实现的方法
 */
export interface VisionProvider {
  /** 提供商名称 */
  name: string;

  /**
   * 识别图片
   * @param request 视觉识别请求
   * @param options 提供商选项
   * @returns 识别结果
   */
  recognizeImage(
    request: VisionRecognitionRequest,
    options: VisionProviderOptions,
  ): Promise<VisionRecognitionResponse>;

  /**
   * 验证配置
   * @param config 配置对象
   * @returns 是否有效
   */
  validateConfig(config: VisionRecognitionConfig): boolean;

  /**
   * 获取支持的模型列表
   * @returns 支持的模型列表
   */
  getSupportedModels(): string[];

  /**
   * 获取默认配置
   * @returns 默认配置
   */
  getDefaultConfig(): Partial<VisionRecognitionConfig>;
}
