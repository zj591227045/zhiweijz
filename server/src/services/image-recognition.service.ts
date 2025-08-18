import { PrismaClient } from '@prisma/client';
import {
  ImageRecognitionRequestDto,
  ImageRecognitionResponseDto,
  BatchImageRecognitionRequestDto,
  BatchImageRecognitionResponseDto,
  ImageRecognitionStatsDto,
  ImageRecognitionConfigDto,
  RecognitionValidationDto,
  RecognitionTemplateDto,
  ImageRecognitionStatus,
  ImageRecognitionType,
  ConfidenceLevel,
  ExtractedData,
  SuggestedTransactionDto,
  ImagePreprocessingOptions,
} from '../models/image-recognition.model';
import { FileStorageService } from './file-storage.service';
import { TransactionService } from './transaction.service';
// import { CategoryService } from './category.service';

const prisma = new PrismaClient();

/**
 * 图片识别服务接口
 * 为未来的图片识别功能预留接口
 */
export interface IImageRecognitionProvider {
  /**
   * 识别图片中的文本和结构化数据
   */
  recognizeImage(
    imageBuffer: Buffer,
    recognitionType: ImageRecognitionType,
    options?: any
  ): Promise<ExtractedData>;

  /**
   * 批量识别图片
   */
  batchRecognizeImages(
    images: { buffer: Buffer; type: ImageRecognitionType }[],
    options?: any
  ): Promise<ExtractedData[]>;

  /**
   * 检查服务可用性
   */
  checkHealth(): Promise<boolean>;
}

/**
 * 图片识别服务
 * 目前为预留接口，未来可以集成各种OCR服务提供商
 */
export class ImageRecognitionService {
  private fileStorageService: FileStorageService;
  private transactionService: TransactionService;
  // private categoryService: CategoryService;
  private provider: IImageRecognitionProvider | null = null;

  constructor() {
    this.fileStorageService = FileStorageService.getInstance();
    this.transactionService = new TransactionService();
    // this.categoryService = new CategoryService();
  }

  /**
   * 设置识别服务提供商
   */
  setProvider(provider: IImageRecognitionProvider): void {
    this.provider = provider;
  }

  /**
   * 识别图片
   */
  async recognizeImage(
    request: ImageRecognitionRequestDto,
    userId: string
  ): Promise<ImageRecognitionResponseDto> {
    try {
      // 验证文件权限
      const file = await this.fileStorageService.getFileById(request.fileId);
      if (!file || file.uploadedBy !== userId) {
        throw new Error('文件不存在或无权限访问');
      }

      // 创建识别记录
      const recognition = await this.createRecognitionRecord(request, userId);

      // 如果没有配置识别服务提供商，返回模拟数据
      if (!this.provider) {
        return this.getMockRecognitionResult(recognition.id, request);
      }

      // 更新状态为处理中
      await this.updateRecognitionStatus(recognition.id, ImageRecognitionStatus.PROCESSING);

      // 下载文件进行识别
      // const imageBuffer = await this.fileStorageService.downloadFile(file.bucket, file.key);
      
      // 执行识别
      // const extractedData = await this.provider.recognizeImage(
      //   imageBuffer,
      //   request.recognitionType,
      //   request.options
      // );

      // 暂时返回模拟数据
      const extractedData = this.getMockExtractedData(request.recognitionType);

      // 生成建议的记账记录
      const suggestedTransaction = await this.generateSuggestedTransaction(
        extractedData,
        userId
      );

      // 更新识别结果
      const result = await this.updateRecognitionResult(
        recognition.id,
        extractedData,
        suggestedTransaction,
        ConfidenceLevel.MEDIUM
      );

      // 如果启用自动创建记账记录
      if (request.options?.autoCreateTransaction && suggestedTransaction) {
        await this.createTransactionFromRecognition(suggestedTransaction, userId, recognition.id);
      }

      return result;
    } catch (error) {
      console.error('图片识别失败:', error);
      throw new Error(`图片识别失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 批量识别图片
   */
  async batchRecognizeImages(
    request: BatchImageRecognitionRequestDto,
    userId: string
  ): Promise<BatchImageRecognitionResponseDto> {
    const batchId = this.generateBatchId();
    const results: ImageRecognitionResponseDto[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const fileId of request.fileIds) {
      try {
        const recognitionRequest: ImageRecognitionRequestDto = {
          fileId,
          recognitionType: request.recognitionType,
          options: request.options,
        };

        const result = await this.recognizeImage(recognitionRequest, userId);
        results.push(result);
        
        if (result.status === ImageRecognitionStatus.COMPLETED) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        failedCount++;
        console.error(`批量识别文件 ${fileId} 失败:`, error);
      }
    }

    return {
      batchId,
      totalFiles: request.fileIds.length,
      processedFiles: results.length,
      successCount,
      failedCount,
      results,
      status: failedCount === 0 ? 'COMPLETED' : 'FAILED',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * 验证识别结果
   */
  async validateRecognition(
    validation: RecognitionValidationDto,
    userId: string
  ): Promise<void> {
    try {
      // 保存验证结果用于机器学习改进
      await this.saveValidationData(validation, userId);
      
      // 更新识别记录的准确性标记
      await this.updateRecognitionAccuracy(validation.recognitionId, validation.isAccurate);
    } catch (error) {
      console.error('保存验证结果失败:', error);
      throw error;
    }
  }

  /**
   * 获取识别统计信息
   */
  async getRecognitionStats(userId: string): Promise<ImageRecognitionStatsDto> {
    try {
      // 这里应该从数据库查询真实的统计数据
      // 目前返回模拟数据
      return {
        totalRecognitions: 150,
        successRate: 0.85,
        averageProcessingTime: 2500,
        recognitionsByType: {
          [ImageRecognitionType.RECEIPT]: 80,
          [ImageRecognitionType.INVOICE]: 45,
          [ImageRecognitionType.BANK_STATEMENT]: 15,
          [ImageRecognitionType.BUSINESS_CARD]: 8,
          [ImageRecognitionType.ID_CARD]: 2,
          [ImageRecognitionType.OTHER]: 0,
        },
        recognitionsByStatus: {
          [ImageRecognitionStatus.COMPLETED]: 128,
          [ImageRecognitionStatus.FAILED]: 15,
          [ImageRecognitionStatus.PROCESSING]: 5,
          [ImageRecognitionStatus.PENDING]: 2,
          [ImageRecognitionStatus.CANCELLED]: 0,
        },
        confidenceDistribution: {
          [ConfidenceLevel.VERY_HIGH]: 45,
          [ConfidenceLevel.HIGH]: 60,
          [ConfidenceLevel.MEDIUM]: 35,
          [ConfidenceLevel.LOW]: 10,
        },
        monthlyStats: [
          { month: '2024-01', count: 25, successRate: 0.80 },
          { month: '2024-02', count: 35, successRate: 0.83 },
          { month: '2024-03', count: 40, successRate: 0.87 },
          { month: '2024-04', count: 50, successRate: 0.85 },
        ],
      };
    } catch (error) {
      console.error('获取识别统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取识别配置
   */
  async getRecognitionConfig(): Promise<ImageRecognitionConfigDto> {
    try {
      // 从系统配置中读取
      const configs = await prisma.systemConfig.findMany({
        where: { category: 'image_recognition' },
      });

      const configMap = configs.reduce((acc, config) => {
        if (config.value) {
          acc[config.key] = config.value;
        }
        return acc;
      }, {} as Record<string, string>);

      return {
        enabled: configMap.enabled === 'true',
        provider: (configMap.provider as any) || 'baidu',
        apiKey: configMap.api_key,
        secretKey: configMap.secret_key,
        endpoint: configMap.endpoint,
        region: configMap.region,
        defaultLanguage: configMap.default_language || 'zh-CN',
        supportedTypes: [
          ImageRecognitionType.RECEIPT,
          ImageRecognitionType.INVOICE,
          ImageRecognitionType.BANK_STATEMENT,
        ],
        maxFileSize: parseInt(configMap.max_file_size || '10485760'),
        supportedFormats: ['jpg', 'jpeg', 'png', 'bmp', 'gif'],
        autoCreateTransaction: configMap.auto_create_transaction === 'true',
        confidenceThreshold: parseFloat(configMap.confidence_threshold || '0.7'),
        enhanceImage: configMap.enhance_image === 'true',
        retryAttempts: parseInt(configMap.retry_attempts || '3'),
        timeoutSeconds: parseInt(configMap.timeout_seconds || '30'),
      };
    } catch (error) {
      console.error('获取识别配置失败:', error);
      throw error;
    }
  }

  /**
   * 更新识别配置
   */
  async updateRecognitionConfig(
    config: Partial<ImageRecognitionConfigDto>,
    updatedBy: string
  ): Promise<void> {
    try {
      const updates = Object.entries(config).map(([key, value]) => ({
        key: this.camelToSnakeCase(key),
        value: typeof value === 'boolean' ? value.toString() : String(value),
      }));

      for (const update of updates) {
        await prisma.systemConfig.upsert({
          where: { key: update.key },
          update: {
            value: update.value,
            updatedBy,
            updatedAt: new Date(),
          },
          create: {
            key: update.key,
            value: update.value,
            category: 'image_recognition',
            description: this.getConfigDescription(update.key),
            createdBy: updatedBy,
            updatedBy: updatedBy,
          },
        });
      }
    } catch (error) {
      console.error('更新识别配置失败:', error);
      throw error;
    }
  }

  // 私有方法

  private async createRecognitionRecord(
    request: ImageRecognitionRequestDto,
    userId: string
  ): Promise<{ id: string }> {
    // 这里应该创建识别记录到数据库
    // 目前返回模拟ID
    return { id: `recognition_${Date.now()}` };
  }

  private async updateRecognitionStatus(
    recognitionId: string,
    status: ImageRecognitionStatus
  ): Promise<void> {
    // 更新识别状态
    console.log(`更新识别状态: ${recognitionId} -> ${status}`);
  }

  private async updateRecognitionResult(
    recognitionId: string,
    extractedData: ExtractedData,
    suggestedTransaction: SuggestedTransactionDto | null,
    confidence: ConfidenceLevel
  ): Promise<ImageRecognitionResponseDto> {
    // 更新识别结果
    return {
      id: recognitionId,
      fileId: 'mock_file_id',
      recognitionType: ImageRecognitionType.RECEIPT,
      status: ImageRecognitionStatus.COMPLETED,
      confidence,
      extractedData,
      suggestedTransaction: suggestedTransaction || undefined,
      processingTime: 2500,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private getMockRecognitionResult(
    recognitionId: string,
    request: ImageRecognitionRequestDto
  ): ImageRecognitionResponseDto {
    const extractedData = this.getMockExtractedData(request.recognitionType);
    
    return {
      id: recognitionId,
      fileId: request.fileId,
      recognitionType: request.recognitionType,
      status: ImageRecognitionStatus.COMPLETED,
      confidence: ConfidenceLevel.MEDIUM,
      extractedData,
      processingTime: 1500,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private getMockExtractedData(type: ImageRecognitionType): ExtractedData {
    switch (type) {
      case ImageRecognitionType.RECEIPT:
        return {
          merchantName: '星巴克咖啡',
          totalAmount: 45.80,
          transactionDate: new Date(),
          paymentMethod: '微信支付',
          category: '餐饮',
          description: '咖啡消费',
          items: [
            { name: '拿铁咖啡', quantity: 1, unitPrice: 32.00, totalPrice: 32.00 },
            { name: '蓝莓马芬', quantity: 1, unitPrice: 13.80, totalPrice: 13.80 },
          ],
          rawText: '星巴克咖啡 拿铁咖啡 32.00 蓝莓马芬 13.80 合计 45.80',
          fieldConfidences: {
            merchantName: 0.95,
            totalAmount: 0.90,
            transactionDate: 0.85,
          },
        };
      
      case ImageRecognitionType.INVOICE:
        return {
          merchantName: '北京科技有限公司',
          totalAmount: 1180.00,
          tax: 180.00,
          subtotal: 1000.00,
          invoiceNumber: 'INV-2024-001234',
          transactionDate: new Date(),
          category: '办公用品',
          description: '办公设备采购',
          rawText: '北京科技有限公司 发票号：INV-2024-001234 金额：1180.00',
        };
      
      default:
        return {
          rawText: '识别的文本内容',
          description: '其他类型文档',
        };
    }
  }

  private async generateSuggestedTransaction(
    extractedData: ExtractedData,
    userId: string
  ): Promise<SuggestedTransactionDto | null> {
    if (!extractedData.totalAmount) return null;

    // 根据提取的数据生成建议的记账记录
    return {
      amount: extractedData.totalAmount,
      type: 'EXPENSE' as any,
      description: extractedData.description || extractedData.merchantName || '图片识别记账',
      date: extractedData.transactionDate || new Date(),
      categoryName: extractedData.category,
      metadata: {
        source: 'image_recognition',
        recognitionId: 'mock_recognition_id',
        confidence: ConfidenceLevel.MEDIUM,
        extractedData,
      },
    };
  }

  private async createTransactionFromRecognition(
    suggestedTransaction: SuggestedTransactionDto,
    userId: string,
    recognitionId: string
  ): Promise<void> {
    // 自动创建记账记录
    console.log('自动创建记账记录:', suggestedTransaction);
  }

  private async saveValidationData(
    validation: RecognitionValidationDto,
    userId: string
  ): Promise<void> {
    // 保存验证数据用于机器学习
    console.log('保存验证数据:', validation);
  }

  private async updateRecognitionAccuracy(
    recognitionId: string,
    isAccurate: boolean
  ): Promise<void> {
    // 更新识别准确性
    console.log(`更新识别准确性: ${recognitionId} -> ${isAccurate}`);
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  private getConfigDescription(key: string): string {
    const descriptions: Record<string, string> = {
      enabled: '是否启用图片识别功能',
      provider: '识别服务提供商',
      api_key: 'API密钥',
      secret_key: '密钥',
      endpoint: '服务端点',
      region: '服务区域',
      default_language: '默认识别语言',
      max_file_size: '最大文件大小',
      auto_create_transaction: '是否自动创建记账记录',
      confidence_threshold: '置信度阈值',
      enhance_image: '是否增强图片',
      retry_attempts: '重试次数',
      timeout_seconds: '超时时间',
    };
    return descriptions[key] || '';
  }
}
