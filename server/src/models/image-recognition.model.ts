import { TransactionType } from '@prisma/client';

/**
 * 图片识别状态枚举
 */
export enum ImageRecognitionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * 图片识别类型枚举
 */
export enum ImageRecognitionType {
  RECEIPT = 'RECEIPT',
  INVOICE = 'INVOICE',
  BANK_STATEMENT = 'BANK_STATEMENT',
  BUSINESS_CARD = 'BUSINESS_CARD',
  ID_CARD = 'ID_CARD',
  OTHER = 'OTHER',
}

/**
 * 识别置信度等级
 */
export enum ConfidenceLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

/**
 * 图片识别请求DTO
 */
export interface ImageRecognitionRequestDto {
  fileId: string;
  recognitionType: ImageRecognitionType;
  options?: {
    language?: string; // 识别语言，默认中文
    extractFields?: string[]; // 需要提取的字段
    enhanceImage?: boolean; // 是否增强图片质量
    autoCreateTransaction?: boolean; // 是否自动创建记账记录
  };
}

/**
 * 图片识别响应DTO
 */
export interface ImageRecognitionResponseDto {
  id: string;
  fileId: string;
  recognitionType: ImageRecognitionType;
  status: ImageRecognitionStatus;
  confidence: ConfidenceLevel;
  extractedData: ExtractedData;
  suggestedTransaction?: SuggestedTransactionDto;
  processingTime?: number; // 处理时间（毫秒）
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 提取的数据结构
 */
export interface ExtractedData {
  // 基础信息
  merchantName?: string; // 商户名称
  merchantAddress?: string; // 商户地址
  merchantPhone?: string; // 商户电话
  
  // 记账信息
  totalAmount?: number; // 总金额
  subtotal?: number; // 小计
  tax?: number; // 税额
  tip?: number; // 小费
  discount?: number; // 折扣
  currency?: string; // 币种
  
  // 时间信息
  transactionDate?: Date; // 记账日期
  transactionTime?: string; // 记账时间
  
  // 支付信息
  paymentMethod?: string; // 支付方式
  cardNumber?: string; // 卡号（脱敏）
  authCode?: string; // 授权码
  
  // 商品明细
  items?: ExtractedItem[];
  
  // 其他信息
  receiptNumber?: string; // 收据号
  invoiceNumber?: string; // 发票号
  category?: string; // 推测的分类
  description?: string; // 描述
  
  // 原始文本
  rawText?: string; // 原始识别文本
  
  // 置信度信息
  fieldConfidences?: Record<string, number>; // 各字段的置信度
}

/**
 * 提取的商品项目
 */
export interface ExtractedItem {
  name: string; // 商品名称
  quantity?: number; // 数量
  unitPrice?: number; // 单价
  totalPrice?: number; // 总价
  category?: string; // 商品分类
  confidence?: number; // 置信度
}

/**
 * 建议的记账记录DTO
 */
export interface SuggestedTransactionDto {
  amount: number;
  type: TransactionType;
  description: string;
  date: Date;
  categoryId?: string; // 建议的分类ID
  categoryName?: string; // 建议的分类名称
  metadata?: {
    source: 'image_recognition';
    recognitionId: string;
    confidence: ConfidenceLevel;
    extractedData: ExtractedData;
  };
}

/**
 * 图片识别批处理请求DTO
 */
export interface BatchImageRecognitionRequestDto {
  fileIds: string[];
  recognitionType: ImageRecognitionType;
  options?: {
    language?: string;
    extractFields?: string[];
    enhanceImage?: boolean;
    autoCreateTransaction?: boolean;
    batchSize?: number; // 批处理大小
  };
}

/**
 * 图片识别批处理响应DTO
 */
export interface BatchImageRecognitionResponseDto {
  batchId: string;
  totalFiles: number;
  processedFiles: number;
  successCount: number;
  failedCount: number;
  results: ImageRecognitionResponseDto[];
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 图片识别统计DTO
 */
export interface ImageRecognitionStatsDto {
  totalRecognitions: number;
  successRate: number;
  averageProcessingTime: number;
  recognitionsByType: Record<ImageRecognitionType, number>;
  recognitionsByStatus: Record<ImageRecognitionStatus, number>;
  confidenceDistribution: Record<ConfidenceLevel, number>;
  monthlyStats: {
    month: string;
    count: number;
    successRate: number;
  }[];
}

/**
 * 图片识别配置DTO
 */
export interface ImageRecognitionConfigDto {
  enabled: boolean;
  provider: 'baidu' | 'tencent' | 'aliyun' | 'google' | 'azure' | 'custom';
  apiKey?: string;
  secretKey?: string;
  endpoint?: string;
  region?: string;
  defaultLanguage: string;
  supportedTypes: ImageRecognitionType[];
  maxFileSize: number; // 最大文件大小（字节）
  supportedFormats: string[]; // 支持的图片格式
  autoCreateTransaction: boolean; // 是否自动创建记账记录
  confidenceThreshold: number; // 置信度阈值（0-1）
  enhanceImage: boolean; // 是否默认增强图片
  retryAttempts: number; // 重试次数
  timeoutSeconds: number; // 超时时间（秒）
}

/**
 * 图片预处理选项
 */
export interface ImagePreprocessingOptions {
  resize?: {
    width: number;
    height: number;
    maintainAspectRatio: boolean;
  };
  enhance?: {
    brightness?: number; // 亮度调整 (-100 到 100)
    contrast?: number; // 对比度调整 (-100 到 100)
    sharpness?: number; // 锐化程度 (0 到 100)
    denoise?: boolean; // 是否降噪
  };
  rotation?: number; // 旋转角度
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * 图片识别结果验证DTO
 */
export interface RecognitionValidationDto {
  recognitionId: string;
  validatedData: ExtractedData;
  corrections: {
    field: string;
    originalValue: any;
    correctedValue: any;
    reason?: string;
  }[];
  isAccurate: boolean;
  feedback?: string;
}

/**
 * 图片识别模板DTO
 */
export interface RecognitionTemplateDto {
  id: string;
  name: string;
  description: string;
  recognitionType: ImageRecognitionType;
  fieldMappings: {
    sourceField: string; // 识别出的字段名
    targetField: string; // 目标字段名
    transform?: string; // 转换规则
    required?: boolean; // 是否必需
  }[];
  categoryMappings: {
    keywords: string[]; // 关键词
    categoryId: string; // 分类ID
    priority: number; // 优先级
  }[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 图片识别学习数据DTO
 */
export interface RecognitionLearningDataDto {
  recognitionId: string;
  originalData: ExtractedData;
  correctedData: ExtractedData;
  userFeedback: string;
  improvementSuggestions: string[];
  createdAt: Date;
}

/**
 * 常用的字段映射
 */
export const COMMON_FIELD_MAPPINGS = {
  RECEIPT: {
    amount: ['total', 'amount', '总计', '合计', '总额'],
    merchantName: ['merchant', 'store', 'shop', '商户', '店铺', '商店'],
    date: ['date', 'time', '日期', '时间'],
    category: ['category', 'type', '分类', '类型'],
  },
  INVOICE: {
    amount: ['total', 'amount', 'sum', '总计', '合计', '金额'],
    merchantName: ['company', 'supplier', '公司', '供应商'],
    invoiceNumber: ['invoice', 'number', '发票号', '编号'],
    date: ['date', 'issue_date', '开票日期', '日期'],
  },
} as const;

/**
 * 默认分类映射规则
 */
export const DEFAULT_CATEGORY_MAPPINGS = [
  { keywords: ['餐厅', '饭店', '咖啡', '奶茶', '快餐'], category: '餐饮' },
  { keywords: ['超市', '便利店', '商场', '购物'], category: '购物' },
  { keywords: ['加油站', '油费', '汽油'], category: '交通' },
  { keywords: ['医院', '药店', '诊所', '体检'], category: '医疗' },
  { keywords: ['电影院', '游戏', '娱乐', 'KTV'], category: '娱乐' },
  { keywords: ['酒店', '住宿', '民宿'], category: '住宿' },
  { keywords: ['水电费', '燃气费', '物业费'], category: '生活缴费' },
] as const;
