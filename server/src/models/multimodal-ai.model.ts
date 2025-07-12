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
  // 新增的三个提示词字段
  relevanceCheckPrompt: string;    // 记账相关性判断提示词
  smartAccountingPrompt: string;   // 智能记账主要提示词
  imageAnalysisPrompt: string;     // 图片分析提示词
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
    multimodalPrompt: '分析图片中的记账信息，提取：1.微信/支付宝付款记录：金额、收款人、备注，并从收款人分析交易类别；2.订单截图（美团/淘宝/京东/外卖/抖音）：内容、金额、时间、收件人；3.发票/票据：内容、分类、金额、时间。返回JSON格式。',
    relevanceCheckPrompt: `你是一个专业的财务助手。请判断以下用户描述是否与记账相关。

判断标准：
1. 包含金额信息（必须）
2. 包含交易流水明细（必须）
3. 可能包含日期信息（可选）
4. 可能包含预算信息（可选）

如果描述中包含明确的金额和交易内容（如购买、支付、收入、转账等），则判定为与记账相关。
如果描述中只是询问、闲聊或其他非交易相关内容，则判定为与记账无关。

请只回答 "相关" 或 "无关"，不要有其他文字。

用户描述: {{description}}`,
    smartAccountingPrompt: `你是专业财务助手，从用户描述中提取记账信息。

分类列表：
{{categories}}

{{budgets}}

从描述中提取：
1. 金额（仅数字）
2. 日期（未提及用今日）
3. 分类（匹配上述分类）
4. 预算（若提及预算/人名则匹配）
5. 备注（简短描述）

返回JSON格式：
{
  "amount": 数字,
  "date": "YYYY-MM-DD",
  "categoryId": "分类ID",
  "categoryName": "分类名",
  "type": "EXPENSE/INCOME",
  "budgetName": "预算名(可选)",
  "confidence": 0-1小数,
  "note": "备注"
}

用户描述: {{description}}
当前日期: {{currentDate}}

仅返回JSON，无其他文字。`,
    imageAnalysisPrompt: `请分析这张图片中的记账信息。

请从图片中识别以下信息：
1. 交易金额：准确的数字金额
2. 交易时间：日期和时间信息
3. 交易对象：商家名称、收款人或付款人
4. 交易类型：收入、支出、转账等
5. 交易内容：商品名称、服务描述或交易备注
6. 其他信息：订单号、交易单号等

请以JSON格式返回结果：
{
  "amount": "金额数字",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "merchant": "商家/收款人名称",
  "type": "EXPENSE/INCOME/TRANSFER",
  "description": "交易描述",
  "category": "推测的交易分类",
  "confidence": 0.0-1.0,
  "additional_info": {
    "order_id": "订单号",
    "transaction_id": "交易号"
  }
}

如果图片中没有明确的记账信息，请返回 {"error": "未识别到记账信息"}。`,
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
