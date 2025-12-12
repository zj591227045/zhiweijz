import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import {
  FullMultimodalAIConfig,
  SpeechRecognitionConfig,
  VisionRecognitionConfig,
  MultimodalAIConfig,
  SmartAccountingMultimodalConfig,
  DEFAULT_MULTIMODAL_CONFIG,
  SUPPORTED_AUDIO_FORMATS,
  SUPPORTED_IMAGE_FORMATS,
} from '../models/multimodal-ai.model';

const prisma = new PrismaClient();

/**
 * 多模态AI配置服务
 * 负责管理语音识别和视觉识别的配置
 */
export class MultimodalAIConfigService {
  /**
   * 获取完整的多模态AI配置
   */
  async getFullConfig(): Promise<FullMultimodalAIConfig> {
    try {
      // 查询所有相关配置，不限定category
      const configs = await prisma.systemConfig.findMany({
        where: {
          OR: [
            { category: 'ai_multimodal' },
            { category: 'general', key: { contains: 'smart_accounting' } },
            { category: 'general', key: { contains: 'speech_' } },
            { category: 'general', key: { contains: 'vision_' } }
          ],
        },
      });

      logger.info('🔍 [配置服务] 从数据库获取到的配置数量:', configs.length);
      logger.info('🔍 [配置服务] 获取到的配置键名:', configs.map(c => c.key));
      
      const configMap = configs.reduce((acc, config) => {
        acc[config.key] = config.value || '';
        return acc;
      }, {} as Record<string, string>);
      
      logger.info('🔍 [配置服务] 智能记账相关配置键:', {
        hasRelevanceCheck: !!configMap.smart_accounting_relevance_check_prompt,
        hasSmartAccounting: !!configMap.smart_accounting_prompt,
        hasImageAnalysis: !!configMap.smart_accounting_image_analysis_prompt,
        hasMultimodal: !!configMap.smart_accounting_multimodal_prompt
      });

      const result = {
        speech: this.parseSpeechConfig(configMap),
        vision: this.parseVisionConfig(configMap),
        smartAccounting: this.parseSmartAccountingConfig(configMap),
      };
      
      logger.info('🔍 [配置服务] 最终返回的智能记账配置长度:', {
        relevanceCheck: result.smartAccounting.relevanceCheckPrompt.length,
        smartAccounting: result.smartAccounting.smartAccountingPrompt.length,
        imageAnalysis: result.smartAccounting.imageAnalysisPrompt.length,
        multimodal: result.smartAccounting.multimodalPrompt.length
      });
      
      return result;
    } catch (error) {
      logger.error('获取多模态AI配置失败:', error);
      return DEFAULT_MULTIMODAL_CONFIG;
    }
  }

  /**
   * 获取语音识别配置
   */
  async getSpeechConfig(): Promise<SpeechRecognitionConfig> {
    const fullConfig = await this.getFullConfig();
    return fullConfig.speech;
  }

  /**
   * 获取视觉识别配置
   */
  async getVisionConfig(): Promise<VisionRecognitionConfig> {
    const fullConfig = await this.getFullConfig();
    return fullConfig.vision;
  }

  /**
   * 更新语音识别配置
   */
  async updateSpeechConfig(config: Partial<SpeechRecognitionConfig>): Promise<void> {
    const configsToUpdate: { key: string; value: string }[] = [];

    if (config.enabled !== undefined) {
      configsToUpdate.push({ key: 'speech_enabled', value: config.enabled.toString() });
    }
    if (config.provider !== undefined) {
      configsToUpdate.push({ key: 'speech_provider', value: config.provider });
    }
    if (config.model !== undefined) {
      configsToUpdate.push({ key: 'speech_model', value: config.model });
    }
    if (config.apiKey !== undefined) {
      configsToUpdate.push({ key: 'speech_api_key', value: config.apiKey });
    }
    if (config.baseUrl !== undefined) {
      configsToUpdate.push({ key: 'speech_base_url', value: config.baseUrl });
    }
    if (config.maxFileSize !== undefined) {
      configsToUpdate.push({ key: 'speech_max_file_size', value: config.maxFileSize.toString() });
    }
    if (config.allowedFormats !== undefined) {
      configsToUpdate.push({ key: 'speech_allowed_formats', value: config.allowedFormats.join(',') });
    }
    if (config.timeout !== undefined) {
      configsToUpdate.push({ key: 'speech_timeout', value: config.timeout.toString() });
    }
    
    // 百度云特有配置
    if (config.secretKey !== undefined) {
      configsToUpdate.push({ key: 'speech_secret_key', value: config.secretKey });
    }

    if (configsToUpdate.length > 0) {
      await this.batchUpsertConfigs(configsToUpdate);
    }
  }

  /**
   * 更新视觉识别配置
   */
  async updateVisionConfig(config: Partial<VisionRecognitionConfig>): Promise<void> {
    const configsToUpdate: { key: string; value: string }[] = [];

    if (config.enabled !== undefined) {
      configsToUpdate.push({ key: 'vision_enabled', value: config.enabled.toString() });
    }
    if (config.provider !== undefined) {
      configsToUpdate.push({ key: 'vision_provider', value: config.provider });
    }
    if (config.model !== undefined) {
      configsToUpdate.push({ key: 'vision_model', value: config.model });
    }
    if (config.apiKey !== undefined) {
      configsToUpdate.push({ key: 'vision_api_key', value: config.apiKey });
    }
    if (config.baseUrl !== undefined) {
      configsToUpdate.push({ key: 'vision_base_url', value: config.baseUrl });
    }
    if (config.maxFileSize !== undefined) {
      configsToUpdate.push({ key: 'vision_max_file_size', value: config.maxFileSize.toString() });
    }
    if (config.allowedFormats !== undefined) {
      configsToUpdate.push({ key: 'vision_allowed_formats', value: config.allowedFormats.join(',') });
    }
    if (config.detailLevel !== undefined) {
      configsToUpdate.push({ key: 'vision_detail_level', value: config.detailLevel });
    }
    if (config.timeout !== undefined) {
      configsToUpdate.push({ key: 'vision_timeout', value: config.timeout.toString() });
    }

    if (configsToUpdate.length > 0) {
      await this.batchUpsertConfigs(configsToUpdate);
    }
  }

  /**
   * 测试语音识别配置
   */
  async testSpeechConfig(config?: Partial<SpeechRecognitionConfig>): Promise<boolean> {
    try {
      const speechConfig = config ? { ...await this.getSpeechConfig(), ...config } : await this.getSpeechConfig();
      
      if (!speechConfig.enabled || !speechConfig.apiKey) {
        return false;
      }

      // 这里可以添加实际的API测试逻辑
      // 暂时返回基本的配置验证结果
      return !!(speechConfig.provider && speechConfig.model && speechConfig.baseUrl);
    } catch (error) {
      logger.error('测试语音识别配置失败:', error);
      return false;
    }
  }

  /**
   * 测试视觉识别配置
   */
  async testVisionConfig(config?: Partial<VisionRecognitionConfig>): Promise<boolean> {
    try {
      const visionConfig = config ? { ...await this.getVisionConfig(), ...config } : await this.getVisionConfig();
      
      if (!visionConfig.enabled || !visionConfig.apiKey) {
        return false;
      }

      // 这里可以添加实际的API测试逻辑
      // 暂时返回基本的配置验证结果
      return !!(visionConfig.provider && visionConfig.model && visionConfig.baseUrl);
    } catch (error) {
      logger.error('测试视觉识别配置失败:', error);
      return false;
    }
  }

  /**
   * 更新智能记账配置
   */
  async updateSmartAccountingConfig(config: Partial<SmartAccountingMultimodalConfig>): Promise<void> {
    const configsToUpdate: { key: string; value: string }[] = [];

    if (config.multimodalPrompt !== undefined) {
      configsToUpdate.push({ key: 'smart_accounting_multimodal_prompt', value: config.multimodalPrompt });
    }
    if (config.relevanceCheckPrompt !== undefined) {
      configsToUpdate.push({ key: 'smart_accounting_relevance_check_prompt', value: config.relevanceCheckPrompt });
    }
    if (config.smartAccountingPrompt !== undefined) {
      configsToUpdate.push({ key: 'smart_accounting_prompt', value: config.smartAccountingPrompt });
    }
    if (config.imageAnalysisPrompt !== undefined) {
      configsToUpdate.push({ key: 'smart_accounting_image_analysis_prompt', value: config.imageAnalysisPrompt });
    }

    if (configsToUpdate.length > 0) {
      await this.batchUpsertConfigs(configsToUpdate);
    }
  }



  /**
   * 解析语音识别配置
   */
  private parseSpeechConfig(configMap: Record<string, string>): SpeechRecognitionConfig {
    return {
      enabled: configMap.speech_enabled === 'true',
      provider: configMap.speech_provider || DEFAULT_MULTIMODAL_CONFIG.speech.provider,
      model: configMap.speech_model || DEFAULT_MULTIMODAL_CONFIG.speech.model,
      apiKey: configMap.speech_api_key || '',
      baseUrl: configMap.speech_base_url || DEFAULT_MULTIMODAL_CONFIG.speech.baseUrl,
      maxFileSize: parseInt(configMap.speech_max_file_size || '10485760'),
      allowedFormats: configMap.speech_allowed_formats?.split(',') || [...SUPPORTED_AUDIO_FORMATS],
      timeout: parseInt(configMap.speech_timeout || '60'),
      // 百度云特有配置
      secretKey: configMap.speech_secret_key || '',
    };
  }

  /**
   * 解析视觉识别配置
   */
  private parseVisionConfig(configMap: Record<string, string>): VisionRecognitionConfig {
    return {
      enabled: configMap.vision_enabled === 'true',
      provider: configMap.vision_provider || DEFAULT_MULTIMODAL_CONFIG.vision.provider,
      model: configMap.vision_model || DEFAULT_MULTIMODAL_CONFIG.vision.model,
      apiKey: configMap.vision_api_key || '',
      baseUrl: configMap.vision_base_url || DEFAULT_MULTIMODAL_CONFIG.vision.baseUrl,
      maxFileSize: parseInt(configMap.vision_max_file_size || '10485760'),
      allowedFormats: configMap.vision_allowed_formats?.split(',') || [...SUPPORTED_IMAGE_FORMATS],
      detailLevel: (configMap.vision_detail_level as 'low' | 'high' | 'auto') || 'high',
      timeout: parseInt(configMap.vision_timeout || '60'),
    };
  }



  /**
   * 解析智能记账配置
   */
  private parseSmartAccountingConfig(configMap: Record<string, string>): SmartAccountingMultimodalConfig {
    logger.info('🔍 [解析配置] 数据库原始配置值:', {
      multimodal: configMap.smart_accounting_multimodal_prompt?.length || 0,
      relevance: configMap.smart_accounting_relevance_check_prompt?.length || 0,
      smartAccounting: configMap.smart_accounting_prompt?.length || 0,
      imageAnalysis: configMap.smart_accounting_image_analysis_prompt?.length || 0
    });
    
    return {
      multimodalPrompt: (configMap.smart_accounting_multimodal_prompt !== undefined && configMap.smart_accounting_multimodal_prompt !== null) ? 
        configMap.smart_accounting_multimodal_prompt : 
        DEFAULT_MULTIMODAL_CONFIG.smartAccounting.multimodalPrompt,
      relevanceCheckPrompt: (configMap.smart_accounting_relevance_check_prompt !== undefined && configMap.smart_accounting_relevance_check_prompt !== null) ? 
        configMap.smart_accounting_relevance_check_prompt : 
        DEFAULT_MULTIMODAL_CONFIG.smartAccounting.relevanceCheckPrompt,
      smartAccountingPrompt: (configMap.smart_accounting_prompt !== undefined && configMap.smart_accounting_prompt !== null) ? 
        configMap.smart_accounting_prompt : 
        DEFAULT_MULTIMODAL_CONFIG.smartAccounting.smartAccountingPrompt,
      imageAnalysisPrompt: (configMap.smart_accounting_image_analysis_prompt !== undefined && configMap.smart_accounting_image_analysis_prompt !== null) ? 
        configMap.smart_accounting_image_analysis_prompt : 
        DEFAULT_MULTIMODAL_CONFIG.smartAccounting.imageAnalysisPrompt,
    };
  }

  /**
   * 更新多个配置（批量操作，避免过多数据库连接）
   */
  private async batchUpsertConfigs(configs: { key: string; value: string }[]): Promise<void> {
    try {
      // 使用事务批量更新，减少数据库连接
      await prisma.$transaction(async (tx) => {
        const updatePromises = configs.map(({ key, value }) => {
          // 根据键名决定使用的category
          const category = key.startsWith('smart_accounting') ? 'general' : 'ai_multimodal';
          
          return tx.systemConfig.upsert({
            where: { key },
            update: { value, updatedAt: new Date() },
            create: {
              key,
              value,
              category,
              description: `多模态AI配置: ${key}`,
            },
          });
        });
        
        await Promise.all(updatePromises);
      });
    } catch (error) {
      logger.error('批量更新配置失败:', error);
      throw new Error('批量更新配置失败');
    }
  }

  /**
   * 更新或插入单个配置（保留以保持兼容性）
   */
  private async upsertConfig(key: string, value: string): Promise<void> {
    // 根据键名决定使用的category
    const category = key.startsWith('smart_accounting') ? 'general' : 'ai_multimodal';
    
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: {
        key,
        value,
        category,
        description: `多模态AI配置: ${key}`,
      },
    });
  }
}
