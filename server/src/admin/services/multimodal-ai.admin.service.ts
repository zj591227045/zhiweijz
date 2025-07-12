import { MultimodalAIConfigService } from '../../services/multimodal-ai-config.service';
import { SpeechRecognitionService } from '../../services/speech-recognition.service';
import { VisionRecognitionService } from '../../services/vision-recognition.service';
import {
  FullMultimodalAIConfig,
  SpeechRecognitionConfig,
  VisionRecognitionConfig,
  MultimodalAIConfig,
  SmartAccountingMultimodalConfig,
} from '../../models/multimodal-ai.model';

/**
 * 管理员多模态AI配置服务
 */
export class MultimodalAIAdminService {
  private configService: MultimodalAIConfigService;
  private speechService: SpeechRecognitionService;
  private visionService: VisionRecognitionService;

  constructor() {
    this.configService = new MultimodalAIConfigService();
    this.speechService = new SpeechRecognitionService();
    this.visionService = new VisionRecognitionService();
  }

  /**
   * 获取完整的多模态AI配置
   */
  async getFullConfig(): Promise<FullMultimodalAIConfig> {
    try {
      return await this.configService.getFullConfig();
    } catch (error) {
      console.error('获取多模态AI配置失败:', error);
      throw new Error('获取多模态AI配置失败');
    }
  }

  /**
   * 更新语音识别配置
   */
  async updateSpeechConfig(config: Partial<SpeechRecognitionConfig>): Promise<void> {
    try {
      await this.configService.updateSpeechConfig(config);
    } catch (error) {
      console.error('更新语音识别配置失败:', error);
      throw new Error('更新语音识别配置失败');
    }
  }

  /**
   * 更新视觉识别配置
   */
  async updateVisionConfig(config: Partial<VisionRecognitionConfig>): Promise<void> {
    try {
      await this.configService.updateVisionConfig(config);
    } catch (error) {
      console.error('更新视觉识别配置失败:', error);
      throw new Error('更新视觉识别配置失败');
    }
  }

  /**
   * 测试语音识别配置
   */
  async testSpeechConfig(config?: Partial<SpeechRecognitionConfig>): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      const isConnected = await this.speechService.testConnection(config);
      
      return {
        success: isConnected,
        message: isConnected ? '语音识别服务连接成功' : '语音识别服务连接失败',
        details: {
          timestamp: new Date().toISOString(),
          provider: config?.provider || (await this.configService.getSpeechConfig()).provider,
        },
      };
    } catch (error) {
      console.error('测试语音识别配置失败:', error);
      return {
        success: false,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /**
   * 测试视觉识别配置
   */
  async testVisionConfig(config?: Partial<VisionRecognitionConfig>): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      const isConnected = await this.visionService.testConnection(config);
      
      return {
        success: isConnected,
        message: isConnected ? '视觉识别服务连接成功' : '视觉识别服务连接失败',
        details: {
          timestamp: new Date().toISOString(),
          provider: config?.provider || (await this.configService.getVisionConfig()).provider,
        },
      };
    } catch (error) {
      console.error('测试视觉识别配置失败:', error);
      return {
        success: false,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /**
   * 获取支持的语音模型列表
   */
  getSupportedSpeechModels(): Array<{ id: string; name: string; provider: string }> {
    return [
      {
        id: 'FunAudioLLM/SenseVoiceSmall',
        name: 'SenseVoice Small',
        provider: 'siliconflow',
      },
      {
        id: 'FunAudioLLM/SenseVoiceLarge',
        name: 'SenseVoice Large',
        provider: 'siliconflow',
      },
      {
        id: 'default',
        name: '通用模型',
        provider: 'baidu',
      },
      {
        id: 'pro',
        name: '专业模型',
        provider: 'baidu',
      },
      {
        id: 'longform',
        name: '长语音模型',
        provider: 'baidu',
      },
    ];
  }

  /**
   * 获取支持的视觉模型列表
   */
  getSupportedVisionModels(): Array<{ id: string; name: string; provider: string }> {
    return [
      {
        id: 'Qwen/Qwen2.5-VL-72B-Instruct',
        name: 'Qwen2.5-VL-72B-Instruct',
        provider: 'siliconflow',
      },
      {
        id: 'Qwen/Qwen2.5-VL-32B-Instruct',
        name: 'Qwen2.5-VL-32B-Instruct',
        provider: 'siliconflow',
      },
      {
        id: 'Qwen/Qwen2-VL-72B-Instruct',
        name: 'Qwen2-VL-72B-Instruct',
        provider: 'siliconflow',
      },
      {
        id: 'THUDM/GLM-4.1V-9B-Thinking',
        name: 'GLM-4.1V-9B-Thinking',
        provider: 'siliconflow',
      },
      {
        id: 'deepseek-ai/deepseek-vl2',
        name: 'DeepSeek-VL2',
        provider: 'siliconflow',
      },
    ];
  }

  /**
   * 获取支持的提供商列表
   */
  getSupportedProviders(): Array<{ id: string; name: string; baseUrl: string }> {
    return [
      {
        id: 'siliconflow',
        name: '硅基流动',
        baseUrl: 'https://api.siliconflow.cn/v1',
      },
      {
        id: 'baidu',
        name: '百度智能云',
        baseUrl: 'https://vop.baidu.com/server_api',
      },
      {
        id: 'openai',
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
      },
      {
        id: 'custom',
        name: '自定义',
        baseUrl: '',
      },
    ];
  }

  /**
   * 获取配置状态概览
   */
  async getConfigStatus(): Promise<{
    speech: {
      enabled: boolean;
      configured: boolean;
      connected: boolean;
    };
    vision: {
      enabled: boolean;
      configured: boolean;
      connected: boolean;
    };
    general: {
      enabled: boolean;
    };
  }> {
    try {
      const config = await this.configService.getFullConfig();
      
      // 检查语音识别状态
      let speechConfigured = false;
      if (config.speech.provider === 'baidu') {
        speechConfigured = !!(config.speech.apiKey && config.speech.secretKey && config.speech.model);
      } else {
        speechConfigured = !!(config.speech.apiKey && config.speech.model && config.speech.baseUrl);
      }
      
      const speechConnected = speechConfigured ? await this.speechService.testConnection() : false;
      
      // 检查视觉识别状态
      const visionConfigured = !!(config.vision.apiKey && config.vision.model && config.vision.baseUrl);
      const visionConnected = visionConfigured ? await this.visionService.testConnection() : false;
      
      return {
        speech: {
          enabled: config.speech.enabled,
          configured: speechConfigured,
          connected: speechConnected,
        },
        vision: {
          enabled: config.vision.enabled,
          configured: visionConfigured,
          connected: visionConnected,
        },
        general: {
          enabled: config.general.enabled,
        },
      };
    } catch (error) {
      console.error('获取配置状态失败:', error);
      throw new Error('获取配置状态失败');
    }
  }

  /**
   * 批量更新配置
   */
  async updateFullConfig(config: {
    speech?: Partial<SpeechRecognitionConfig>;
    vision?: Partial<VisionRecognitionConfig>;
    general?: Partial<MultimodalAIConfig>;
    smartAccounting?: Partial<SmartAccountingMultimodalConfig>;
  }): Promise<void> {
    try {
      const updates: Promise<void>[] = [];

      if (config.speech) {
        updates.push(this.configService.updateSpeechConfig(config.speech));
      }

      if (config.vision) {
        updates.push(this.configService.updateVisionConfig(config.vision));
      }

      if (config.general) {
        updates.push(this.configService.updateGeneralConfig(config.general));
      }

      if (config.smartAccounting) {
        updates.push(this.configService.updateSmartAccountingConfig(config.smartAccounting));
      }

      await Promise.all(updates);
    } catch (error) {
      console.error('批量更新配置失败:', error);
      throw new Error('批量更新配置失败');
    }
  }
}
