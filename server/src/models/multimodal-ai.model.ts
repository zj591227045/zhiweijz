/**
 * 多模态AI配置和类型定义
 */

/**
 * 语音识别配置
 */
export interface SpeechRecognitionConfig {
  enabled: boolean;
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  maxFileSize: number;
  allowedFormats: string[];
  timeout: number;
  // 百度云特有配置 - 根据官方文档，使用 API Key 和 Secret Key
  secretKey?: string;
}

/**
 * 视觉识别配置
 */
export interface VisionRecognitionConfig {
  enabled: boolean;
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  maxFileSize: number;
  allowedFormats: string[];
  detailLevel: 'low' | 'high' | 'auto';
  timeout: number;
}

/**
 * 多模态AI通用配置
 */
export interface MultimodalAIConfig {
  enabled: boolean;
  dailyLimit: number;
  userLimit: number;
  retryCount: number;
  cacheEnabled: boolean;
  cacheTtl: number;
}

/**
 * 智能记账多模态配置
 */
export interface SmartAccountingMultimodalConfig {
  visionEnabled: boolean;
  speechEnabled: boolean;
  multimodalPrompt: string;
}

/**
 * 完整的多模态AI配置
 */
export interface FullMultimodalAIConfig {
  speech: SpeechRecognitionConfig;
  vision: VisionRecognitionConfig;
  general: MultimodalAIConfig;
  smartAccounting: SmartAccountingMultimodalConfig;
}

/**
 * 语音识别请求
 */
export interface SpeechRecognitionRequest {
  audioFile: Express.Multer.File;
  language?: string;
  format?: string;
}

/**
 * 语音识别响应
 */
export interface SpeechRecognitionResponse {
  text: string;
  confidence?: number;
  duration?: number;
  language?: string;
}

/**
 * 视觉识别请求
 */
export interface VisionRecognitionRequest {
  imageFile?: Express.Multer.File;
  imageUrl?: string;
  imageBase64?: string;
  prompt?: string;
  detailLevel?: 'low' | 'high' | 'auto';
}

/**
 * 视觉识别响应
 */
export interface VisionRecognitionResponse {
  text: string;
  confidence?: number;
  objects?: Array<{
    name: string;
    confidence: number;
    bbox?: [number, number, number, number];
  }>;
  extractedText?: string;
}

/**
 * 多模态AI服务响应
 */
export interface MultimodalAIResponse {
  success: boolean;
  data?: SpeechRecognitionResponse | VisionRecognitionResponse;
  error?: string;
  usage?: {
    tokens?: number;
    cost?: number;
    duration: number;
  };
}

/**
 * 多模态AI调用日志
 */
export interface MultimodalAICallLog {
  id: string;
  userId: string;
  accountBookId?: string;
  type: 'speech' | 'vision';
  provider: string;
  model: string;
  inputSize: number;
  outputText: string;
  isSuccess: boolean;
  errorMessage?: string;
  duration: number;
  tokens?: number;
  createdAt: Date;
}

/**
 * 支持的语音文件格式
 * Updated to include webm support
 */
export const SUPPORTED_AUDIO_FORMATS = ['mp3', 'wav', 'm4a', 'flac', 'aac', 'webm'] as const;

/**
 * 支持的图片文件格式
 */
export const SUPPORTED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'] as const;

/**
 * 支持的语音识别提供商
 */
export const SUPPORTED_SPEECH_PROVIDERS = [
  {
    id: 'siliconflow',
    name: '硅基流动',
    baseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'FunAudioLLM/SenseVoiceSmall',
    supportedModels: ['FunAudioLLM/SenseVoiceSmall', 'whisper-1'],
  },
  {
    id: 'baidu',
    name: '百度智能云',
    baseUrl: 'https://vop.baidu.com/server_api',
    defaultModel: 'default',
    supportedModels: ['default', 'pro', 'longform'],
  },
] as const;

/**
 * 默认配置值
 */
export const DEFAULT_MULTIMODAL_CONFIG: FullMultimodalAIConfig = {
  speech: {
    enabled: false,
    provider: 'siliconflow',
    model: 'FunAudioLLM/SenseVoiceSmall',
    apiKey: '',
    baseUrl: 'https://api.siliconflow.cn/v1',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFormats: [...SUPPORTED_AUDIO_FORMATS],
    timeout: 60,
  },
  vision: {
    enabled: false,
    provider: 'siliconflow',
    model: 'Qwen/Qwen2.5-VL-72B-Instruct',
    apiKey: '',
    baseUrl: 'https://api.siliconflow.cn/v1',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFormats: [...SUPPORTED_IMAGE_FORMATS],
    detailLevel: 'high',
    timeout: 60,
  },
  general: {
    enabled: false,
    dailyLimit: 100,
    userLimit: 10,
    retryCount: 3,
    cacheEnabled: true,
    cacheTtl: 3600,
  },
  smartAccounting: {
    visionEnabled: false,
    speechEnabled: false,
    multimodalPrompt: '请分析这个图片/语音内容，提取其中的记账信息，包括金额、类别、时间、备注等。',
  },
};

/**
 * 多模态AI错误类型
 */
export enum MultimodalAIErrorType {
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  INVALID_CONFIG = 'INVALID_CONFIG',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
}

/**
 * 多模态AI错误
 */
export class MultimodalAIError extends Error {
  constructor(
    public type: MultimodalAIErrorType,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'MultimodalAIError';
  }
}
