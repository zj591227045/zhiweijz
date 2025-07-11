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
      const configs = await prisma.systemConfig.findMany({
        where: {
          category: 'ai_multimodal',
        },
      });

      const configMap = configs.reduce((acc, config) => {
        acc[config.key] = config.value || '';
        return acc;
      }, {} as Record<string, string>);

      return {
        speech: this.parseSpeechConfig(configMap),
        vision: this.parseVisionConfig(configMap),
        general: this.parseGeneralConfig(configMap),
        smartAccounting: this.parseSmartAccountingConfig(configMap),
      };
    } catch (error) {
      console.error('获取多模态AI配置失败:', error);
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
    const updates: Promise<any>[] = [];

    if (config.enabled !== undefined) {
      updates.push(this.upsertConfig('speech_enabled', config.enabled.toString()));
    }
    if (config.provider !== undefined) {
      updates.push(this.upsertConfig('speech_provider', config.provider));
    }
    if (config.model !== undefined) {
      updates.push(this.upsertConfig('speech_model', config.model));
    }
    if (config.apiKey !== undefined) {
      updates.push(this.upsertConfig('speech_api_key', config.apiKey));
    }
    if (config.baseUrl !== undefined) {
      updates.push(this.upsertConfig('speech_base_url', config.baseUrl));
    }
    if (config.maxFileSize !== undefined) {
      updates.push(this.upsertConfig('speech_max_file_size', config.maxFileSize.toString()));
    }
    if (config.allowedFormats !== undefined) {
      updates.push(this.upsertConfig('speech_allowed_formats', config.allowedFormats.join(',')));
    }
    if (config.timeout !== undefined) {
      updates.push(this.upsertConfig('speech_timeout', config.timeout.toString()));
    }
    
    // 百度云特有配置
    if (config.secretKey !== undefined) {
      updates.push(this.upsertConfig('speech_secret_key', config.secretKey));
    }

    await Promise.all(updates);
  }

  /**
   * 更新视觉识别配置
   */
  async updateVisionConfig(config: Partial<VisionRecognitionConfig>): Promise<void> {
    const updates: Promise<any>[] = [];

    if (config.enabled !== undefined) {
      updates.push(this.upsertConfig('vision_enabled', config.enabled.toString()));
    }
    if (config.provider !== undefined) {
      updates.push(this.upsertConfig('vision_provider', config.provider));
    }
    if (config.model !== undefined) {
      updates.push(this.upsertConfig('vision_model', config.model));
    }
    if (config.apiKey !== undefined) {
      updates.push(this.upsertConfig('vision_api_key', config.apiKey));
    }
    if (config.baseUrl !== undefined) {
      updates.push(this.upsertConfig('vision_base_url', config.baseUrl));
    }
    if (config.maxFileSize !== undefined) {
      updates.push(this.upsertConfig('vision_max_file_size', config.maxFileSize.toString()));
    }
    if (config.allowedFormats !== undefined) {
      updates.push(this.upsertConfig('vision_allowed_formats', config.allowedFormats.join(',')));
    }
    if (config.detailLevel !== undefined) {
      updates.push(this.upsertConfig('vision_detail_level', config.detailLevel));
    }
    if (config.timeout !== undefined) {
      updates.push(this.upsertConfig('vision_timeout', config.timeout.toString()));
    }

    await Promise.all(updates);
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
      console.error('测试语音识别配置失败:', error);
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
      console.error('测试视觉识别配置失败:', error);
      return false;
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
   * 解析通用配置
   */
  private parseGeneralConfig(configMap: Record<string, string>): MultimodalAIConfig {
    return {
      enabled: configMap.multimodal_ai_enabled === 'true',
      dailyLimit: parseInt(configMap.multimodal_ai_daily_limit || '100'),
      userLimit: parseInt(configMap.multimodal_ai_user_limit || '10'),
      retryCount: parseInt(configMap.multimodal_ai_retry_count || '3'),
      cacheEnabled: configMap.multimodal_ai_cache_enabled === 'true',
      cacheTtl: parseInt(configMap.multimodal_ai_cache_ttl || '3600'),
    };
  }

  /**
   * 解析智能记账配置
   */
  private parseSmartAccountingConfig(configMap: Record<string, string>): SmartAccountingMultimodalConfig {
    return {
      visionEnabled: configMap.smart_accounting_vision_enabled === 'true',
      speechEnabled: configMap.smart_accounting_speech_enabled === 'true',
      multimodalPrompt: configMap.smart_accounting_multimodal_prompt || DEFAULT_MULTIMODAL_CONFIG.smartAccounting.multimodalPrompt,
    };
  }

  /**
   * 更新或插入配置
   */
  private async upsertConfig(key: string, value: string): Promise<void> {
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: {
        key,
        value,
        category: 'ai_multimodal',
        description: `多模态AI配置: ${key}`,
      },
    });
  }
}
