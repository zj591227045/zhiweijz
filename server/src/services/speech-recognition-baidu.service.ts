import axios from 'axios';
import crypto from 'crypto';
import {
  SpeechRecognitionRequest,
  SpeechRecognitionResponse,
  MultimodalAIResponse,
  MultimodalAIError,
  MultimodalAIErrorType,
  SpeechRecognitionConfig,
} from '../models/multimodal-ai.model';

/**
 * 百度云语音识别服务
 * 基于百度智能云语音识别API实现
 */
export class BaiduSpeechRecognitionService {
  private accessToken: string = '';
  private tokenExpiry: number = 0;

  /**
   * 语音转文本
   */
  async speechToText(
    request: SpeechRecognitionRequest,
    config: SpeechRecognitionConfig
  ): Promise<MultimodalAIResponse> {
    const startTime = Date.now();

    try {
      // 验证配置
      this.validateConfig(config);

      // 验证文件
      this.validateAudioFile(request.audioFile, config);

      // 获取访问令牌
      const accessToken = await this.getAccessToken(config);

      // 调用百度云API
      const result = await this.callBaiduAPI(request, config, accessToken);

      const duration = Date.now() - startTime;

      return {
        success: true,
        data: result,
        usage: {
          duration,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof MultimodalAIError) {
        return {
          success: false,
          error: error.message,
          usage: { duration },
        };
      }

      console.error('百度云语音识别失败:', error);
      return {
        success: false,
        error: '百度云语音识别服务暂时不可用',
        usage: { duration },
      };
    }
  }

  /**
   * 测试连接
   */
  async testConnection(config: SpeechRecognitionConfig): Promise<boolean> {
    try {
      // 验证配置
      this.validateConfig(config);

      // 测试获取访问令牌
      const accessToken = await this.getAccessToken(config);
      
      return !!accessToken;
    } catch (error) {
      console.error('测试百度云语音识别连接失败:', error);
      return false;
    }
  }

  /**
   * 获取百度云访问令牌
   */
  private async getAccessToken(config: SpeechRecognitionConfig): Promise<string> {
    // 检查是否已有有效的访问令牌
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      console.log('🔑 [BaiduAuth] 使用缓存的访问令牌');
      return this.accessToken;
    }

    try {
      console.log('🔑 [BaiduAuth] 开始获取新的访问令牌');
      console.log('🔑 [BaiduAuth] API Key长度:', config.apiKey?.length || 0);
      console.log('🔑 [BaiduAuth] Secret Key长度:', config.secretKey?.length || 0);
      
      const tokenUrl = 'https://aip.baidubce.com/oauth/2.0/token';
      const params = {
        grant_type: 'client_credentials',
        client_id: config.apiKey,     // 百度云的 API Key
        client_secret: config.secretKey, // 百度云的 Secret Key
      };
      
      console.log('🔑 [BaiduAuth] 请求Token URL:', tokenUrl);
      console.log('🔑 [BaiduAuth] 请求参数:', {
        grant_type: params.grant_type,
        client_id: config.apiKey ? `${config.apiKey.substring(0, 8)}...` : 'MISSING',
        client_secret: config.secretKey ? `${config.secretKey.substring(0, 8)}...` : 'MISSING'
      });

      const response = await axios.post(tokenUrl, null, {
        params,
        timeout: 10000,
      });

      console.log('🔑 [BaiduAuth] Token响应状态:', response.status);
      console.log('🔑 [BaiduAuth] Token响应数据:', {
        access_token: response.data.access_token ? `${response.data.access_token.substring(0, 20)}...` : 'MISSING',
        expires_in: response.data.expires_in,
        error: response.data.error,
        error_description: response.data.error_description
      });

      if (response.data.access_token) {
        this.accessToken = response.data.access_token;
        // 令牌有效期为30天，提前5分钟过期
        this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;
        console.log('🔑 [BaiduAuth] 访问令牌获取成功，有效期:', new Date(this.tokenExpiry));
        return this.accessToken;
      }

      // 如果有错误信息，记录详细错误
      if (response.data.error) {
        console.error('🔑 [BaiduAuth] 百度云返回错误:', {
          error: response.data.error,
          error_description: response.data.error_description
        });
        throw new MultimodalAIError(
          MultimodalAIErrorType.API_ERROR,
          `百度云Token获取失败: ${response.data.error_description || response.data.error}`
        );
      }

      throw new MultimodalAIError(
        MultimodalAIErrorType.API_ERROR,
        '获取百度云访问令牌失败：响应中没有access_token'
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('🔑 [BaiduAuth] 网络请求失败:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
        
        throw new MultimodalAIError(
          MultimodalAIErrorType.API_ERROR,
          `获取百度云访问令牌失败: ${error.response?.data?.error_description || error.message}`
        );
      }
      console.error('🔑 [BaiduAuth] 未知错误:', error);
      throw error;
    }
  }

  /**
   * 调用百度云语音识别API
   */
  private async callBaiduAPI(
    request: SpeechRecognitionRequest,
    config: SpeechRecognitionConfig,
    accessToken: string
  ): Promise<SpeechRecognitionResponse> {
    try {
      // 检查音频格式
      let audioBuffer = request.audioFile.buffer;
      let audioFormat = this.getAudioFormat(request.audioFile.originalname);
      
      // 如果是webm格式，返回友好的错误信息
      if (audioFormat === 'webm') {
        throw new MultimodalAIError(
          MultimodalAIErrorType.UNSUPPORTED_FORMAT,
          '百度云语音识别不支持webm格式。请使用wav、mp3、flac、aac、m4a格式的音频文件。如果您使用的是浏览器录音，建议在前端转换为wav格式后再上传。'
        );
      }
      
      // 将音频文件转换为base64
      const audioBase64 = audioBuffer.toString('base64');
      
      // 构建请求数据 - 按照百度云API规范
      const requestData = {
        format: audioFormat,
        rate: 16000, // 采样率，支持 8000 或 16000
        channel: 1,  // 声道数，仅支持单声道
        cuid: crypto.randomUUID(), // 用户唯一标识
        token: accessToken,
        speech: audioBase64,
        len: audioBuffer.length,
        dev_pid: this.getDeviceId(config.model, request.language),
      };

      // 调用百度云语音识别API - 使用标准版API
      const response = await axios.post(
        'https://vop.baidu.com/server_api',
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: config.timeout * 1000,
        }
      );

      // 解析响应
      const data = response.data;
      
      if (data.err_no !== 0) {
        throw new MultimodalAIError(
          MultimodalAIErrorType.API_ERROR,
          `百度云API错误: ${data.err_msg || '未知错误'} (错误码: ${data.err_no})`
        );
      }

      if (!data.result || !Array.isArray(data.result) || data.result.length === 0) {
        throw new MultimodalAIError(
          MultimodalAIErrorType.API_ERROR,
          '百度云API返回的响应格式不正确'
        );
      }

      return {
        text: data.result[0],
        confidence: data.confidence,
        language: request.language || 'zh-CN',
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new MultimodalAIError(
            MultimodalAIErrorType.TIMEOUT,
            '百度云语音识别请求超时'
          );
        }
        
        if (error.response?.status === 429) {
          throw new MultimodalAIError(
            MultimodalAIErrorType.QUOTA_EXCEEDED,
            '百度云API调用频率限制'
          );
        }

        if (error.response?.data?.err_msg) {
          throw new MultimodalAIError(
            MultimodalAIErrorType.API_ERROR,
            `百度云API错误: ${error.response.data.err_msg}`
          );
        }

        throw new MultimodalAIError(
          MultimodalAIErrorType.API_ERROR,
          `百度云API调用失败: ${error.message}`
        );
      }

      throw error;
    }
  }

  /**
   * 验证配置
   */
  private validateConfig(config: SpeechRecognitionConfig): void {
    if (!config.apiKey) {
      throw new MultimodalAIError(
        MultimodalAIErrorType.INVALID_CONFIG,
        '百度云语音识别 API Key 未配置'
      );
    }

    if (!config.secretKey) {
      throw new MultimodalAIError(
        MultimodalAIErrorType.INVALID_CONFIG,
        '百度云语音识别 Secret Key 未配置'
      );
    }
  }

  /**
   * 验证音频文件
   */
  private validateAudioFile(file: Express.Multer.File, config: SpeechRecognitionConfig): void {
    if (!file) {
      throw new MultimodalAIError(
        MultimodalAIErrorType.PROCESSING_ERROR,
        '未提供音频文件'
      );
    }

    // 检查文件大小 (百度云限制为60MB)
    const maxSize = Math.min(config.maxFileSize, 60 * 1024 * 1024);
    if (file.size > maxSize) {
      throw new MultimodalAIError(
        MultimodalAIErrorType.FILE_TOO_LARGE,
        `音频文件大小超过限制 (${maxSize} 字节)`
      );
    }

    // 检查文件格式 - 百度云不支持webm，需要明确排除
    const fileExtension = this.getFileExtension(file.originalname);
    const baiduSupportedFormats = ['mp3', 'wav', 'pcm', 'flac', 'aac', 'm4a']; // 百度云真正支持的格式
    
    if (!baiduSupportedFormats.includes(fileExtension)) {
      if (fileExtension === 'webm') {
        throw new MultimodalAIError(
          MultimodalAIErrorType.UNSUPPORTED_FORMAT,
          '百度云语音识别不支持webm格式。建议使用wav、mp3、flac、aac、m4a格式。如果您使用的是浏览器录音，请在前端将webm转换为wav格式后再上传。'
        );
      } else {
        throw new MultimodalAIError(
          MultimodalAIErrorType.UNSUPPORTED_FORMAT,
          `不支持的音频格式: ${fileExtension}。百度云支持的格式: ${baiduSupportedFormats.join(', ')}`
        );
      }
    }
  }

  /**
   * 获取音频格式
   */
  private getAudioFormat(filename: string): string {
    const extension = this.getFileExtension(filename);
    
    // 百度云支持的格式映射
    const formatMap: Record<string, string> = {
      'mp3': 'mp3',
      'wav': 'wav',
      'pcm': 'pcm',
      'flac': 'flac',
      'aac': 'aac',
      'm4a': 'aac',
      'webm': 'webm', // 虽然不支持，但需要识别以便给出友好错误信息
    };

    return formatMap[extension] || 'wav';
  }

  /**
   * 获取设备ID (用于选择语言和模型)
   * 百度云语音识别支持的dev_pid参数说明：
   */
  private getDeviceId(model: string, language?: string): number {
    // 根据百度云官方文档的dev_pid定义：
    
    // 普通话模型
    if (!language || language.includes('zh') || language.includes('cn')) {
      switch (model) {
        case 'pro':
          return 80001; // 极速版ASR_PRO（普通话专业版）
        case 'longform':
          return 1936; // 普通话远场/长语音识别
        default:
          return 1537; // 普通话(支持简单的英文识别)
      }
    }
    
    // 英语模型
    if (language === 'en' || language === 'en-US') {
      return 1737; // 英语
    }
    
    // 粤语模型
    if (language === 'yue' || language === 'zh-HK' || language === 'zh-TW') {
      return 1637; // 粤语
    }
    
    // 四川话
    if (language === 'zh-SC') {
      return 1837; // 四川话
    }
    
    // 默认返回普通话
    return 1537;
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }
}