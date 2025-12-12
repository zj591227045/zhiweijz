import { logger } from '../utils/logger';
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

      logger.error('百度云语音识别失败:', error);
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
      logger.error('测试百度云语音识别连接失败:', error);
      return false;
    }
  }

  /**
   * 获取百度云访问令牌
   */
  private async getAccessToken(config: SpeechRecognitionConfig): Promise<string> {
    // 检查是否已有有效的访问令牌
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      logger.info('🔑 [BaiduAuth] 使用缓存的访问令牌');
      return this.accessToken;
    }

    try {
      logger.info('🔑 [BaiduAuth] 开始获取新的访问令牌');
      logger.info('🔑 [BaiduAuth] API Key长度:', config.apiKey?.length || 0);
      logger.info('🔑 [BaiduAuth] Secret Key长度:', config.secretKey?.length || 0);
      
      const tokenUrl = 'https://aip.baidubce.com/oauth/2.0/token';
      const params = {
        grant_type: 'client_credentials',
        client_id: config.apiKey,     // 百度云的 API Key
        client_secret: config.secretKey, // 百度云的 Secret Key
      };
      
      logger.info('🔑 [BaiduAuth] 请求Token URL:', tokenUrl);
      logger.info('🔑 [BaiduAuth] 请求参数:', {
        grant_type: params.grant_type,
        client_id: config.apiKey ? `${config.apiKey.substring(0, 8)}...` : 'MISSING',
        client_secret: config.secretKey ? `${config.secretKey.substring(0, 8)}...` : 'MISSING'
      });

      const response = await axios.post(tokenUrl, null, {
        params,
        timeout: 10000,
      });

      logger.info('🔑 [BaiduAuth] Token响应状态:', response.status);
      logger.info('🔑 [BaiduAuth] Token响应数据:', {
        access_token: response.data.access_token ? `${response.data.access_token.substring(0, 20)}...` : 'MISSING',
        expires_in: response.data.expires_in,
        error: response.data.error,
        error_description: response.data.error_description
      });

      if (response.data.access_token) {
        this.accessToken = response.data.access_token;
        // 令牌有效期为30天，提前5分钟过期
        this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;
        logger.info('🔑 [BaiduAuth] 访问令牌获取成功，有效期:', new Date(this.tokenExpiry));
        return this.accessToken;
      }

      // 如果有错误信息，记录详细错误
      if (response.data.error) {
        logger.error('🔑 [BaiduAuth] 百度云返回错误:', {
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
        logger.error('🔑 [BaiduAuth] 网络请求失败:', {
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
      logger.error('🔑 [BaiduAuth] 未知错误:', error);
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
          '百度云语音识别不支持webm格式。支持的格式：pcm、wav、amr、m4a。如果您使用的是浏览器录音，建议在前端转换为wav格式后再上传。'
        );
      }
      
      // 检测音频文件的实际参数
      let actualSampleRate = 16000; // 默认采样率
      let actualChannels = 1; // 默认单声道

      // 将音频文件转换为base64
      const audioBase64 = audioBuffer.toString('base64');

      // 如果是AMR格式，添加详细的音频参数检测
      if (audioFormat === 'amr') {
        const amrInfo = this.analyzeAmrFile(audioBuffer);
        actualSampleRate = amrInfo.sampleRate; // 使用检测到的实际采样率
        actualChannels = amrInfo.channels;

        logger.info(`🔍 [AMR详细分析] AMR文件参数:`, {
          文件头: audioBuffer.slice(0, 10).toString('hex'),
          文件大小: audioBuffer.length,
          Base64长度: audioBase64.length,
          MIME类型: request.audioFile.mimetype,
          AMR格式: amrInfo.format,
          采样率: amrInfo.sampleRate,
          声道数: amrInfo.channels,
          比特率: amrInfo.bitRate,
          编码模式: amrInfo.mode,
          帧数: amrInfo.frameCount,
          估计时长: amrInfo.estimatedDuration,
          是否符合百度要求: amrInfo.baiduCompatible,
          兼容性问题: amrInfo.compatibilityIssues
        });

        // 检查兼容性问题
        if (!amrInfo.baiduCompatible) {
          throw new MultimodalAIError(
            MultimodalAIErrorType.UNSUPPORTED_FORMAT,
            `AMR文件不符合百度API要求: ${amrInfo.compatibilityIssues.join(', ')}`
          );
        }
      }

      // 构建请求数据 - 按照百度云官方文档JSON格式规范
      const requestData = {
        format: audioFormat,
        rate: actualSampleRate, // 使用检测到的实际采样率
        channel: actualChannels, // 使用检测到的实际声道数
        cuid: crypto.randomUUID(), // 用户唯一标识
        token: accessToken,
        speech: audioBase64,
        len: audioBuffer.length,
        dev_pid: this.getDeviceId(config.model, request.language),
      };

      // 添加调试日志
      logger.info(`🔍 [百度语音API] 请求参数详情:`, {
        format: requestData.format,
        rate: requestData.rate,
        channel: requestData.channel,
        len: requestData.len,
        dev_pid: requestData.dev_pid,
        speechLength: audioBase64.length,
        originalFileName: request.audioFile.originalname,
        detectedFormat: audioFormat,
        fileSize: audioBuffer.length
      });

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
    const baiduSupportedFormats = ['pcm', 'wav', 'amr', 'm4a']; // 百度云官方支持的格式：pcm、wav、amr、m4a
    
    if (!baiduSupportedFormats.includes(fileExtension)) {
      if (fileExtension === 'webm') {
        throw new MultimodalAIError(
          MultimodalAIErrorType.UNSUPPORTED_FORMAT,
          '百度云语音识别不支持webm格式。支持的格式：pcm、wav、amr、m4a。如果您使用的是浏览器录音，请在前端将webm转换为wav格式后再上传。'
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

    // 百度云支持的格式映射（根据官方文档：pcm、wav、amr、m4a）
    const formatMap: Record<string, string> = {
      'wav': 'wav',
      'pcm': 'pcm',
      'amr': 'amr', // 微信语音消息格式
      'm4a': 'm4a', // 微信小程序录音格式
      'webm': 'webm', // 虽然不支持，但需要识别以便给出友好错误信息
    };

    const detectedFormat = formatMap[extension] || 'wav';
    logger.info(`🔍 [格式检测] 文件名: ${filename}, 扩展名: ${extension}, 映射格式: ${detectedFormat}`);

    return detectedFormat;
  }

  /**
   * 获取设备ID (用于选择语言和模型)
   * 百度云语音识别支持的dev_pid参数说明：
   * 根据官方文档：https://ai.baidu.com/ai-doc/SPEECH/Jlbxdezuf
   */
  private getDeviceId(model: string, language?: string): number {
    // 根据百度云官方文档的dev_pid定义：
    // 1537: 普通话(纯中文识别) - 语音近场识别模型 - 有标点 - 支持自定义词库
    // 1737: 英语 - 英语模型 - 无标点 - 不支持自定义词库
    // 1637: 粤语 - 粤语模型 - 有标点 - 不支持自定义词库
    // 1837: 四川话 - 四川话模型 - 有标点 - 不支持自定义词库

    // 普通话模型 - 使用标准版API，不使用极速版
    if (!language || language.includes('zh') || language.includes('cn')) {
      return 1537; // 普通话(纯中文识别)
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
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    logger.info(`🔍 [扩展名提取] 文件名: ${filename}, 提取的扩展名: ${extension}`);
    return extension;
  }

  /**
   * 分析AMR文件的详细参数
   */
  private analyzeAmrFile(buffer: Buffer): {
    format: string;
    sampleRate: number;
    channels: number;
    bitRate: number;
    mode: string;
    frameCount: number;
    estimatedDuration: number;
    baiduCompatible: boolean;
    compatibilityIssues: string[];
  } {
    const issues: string[] = [];

    // AMR文件头分析
    const header = buffer.slice(0, 6).toString('ascii');
    let format = 'unknown';
    let sampleRate = 8000; // AMR默认采样率
    let channels = 1; // AMR固定单声道

    // 检查AMR文件头
    if (header === '#!AMR\n') {
      format = 'AMR-NB'; // Narrowband (8kHz)
      sampleRate = 8000;
    } else if (header === '#!AMR-WB\n') {
      format = 'AMR-WB'; // Wideband (16kHz)
      sampleRate = 16000;
    } else {
      format = 'Invalid AMR';
      issues.push('无效的AMR文件头');
    }

    // 分析AMR帧
    let frameCount = 0;
    let totalBits = 0;
    let offset = 6; // 跳过文件头

    // AMR-NB模式对应的比特率 (bits per frame)
    const amrNbModes = [95, 103, 118, 134, 148, 159, 204, 244]; // bits per 20ms frame
    // AMR-WB模式对应的比特率
    const amrWbModes = [132, 177, 253, 285, 317, 365, 397, 461, 477]; // bits per 20ms frame

    while (offset < buffer.length) {
      if (offset >= buffer.length) break;

      const frameHeader = buffer[offset];
      const mode = (frameHeader >> 3) & 0x0F; // 提取模式位

      let frameBits = 0;
      if (format === 'AMR-NB' && mode < amrNbModes.length) {
        frameBits = amrNbModes[mode];
      } else if (format === 'AMR-WB' && mode < amrWbModes.length) {
        frameBits = amrWbModes[mode];
      }

      if (frameBits > 0) {
        totalBits += frameBits;
        frameCount++;
        // 每帧的字节数 = (比特数 + 7) / 8，再加上1字节的帧头
        const frameBytes = Math.ceil(frameBits / 8) + 1;
        offset += frameBytes;
      } else {
        // 无法解析的帧，跳出循环
        break;
      }

      // 防止无限循环
      if (frameCount > 3000) break; // 最多60秒 * 50帧/秒
    }

    // 计算平均比特率和时长
    const estimatedDuration = frameCount * 0.02; // 每帧20ms
    const avgBitRate = frameCount > 0 ? Math.round(totalBits / frameCount) : 0;

    // 检查百度API兼容性
    let baiduCompatible = true;

    // 百度API要求检查
    if (format === 'Invalid AMR') {
      baiduCompatible = false;
      issues.push('文件格式不是有效的AMR');
    }

    if (sampleRate !== 8000 && sampleRate !== 16000) {
      baiduCompatible = false;
      issues.push(`采样率${sampleRate}Hz不被支持，百度API仅支持8000Hz或16000Hz`);
    }

    if (channels !== 1) {
      baiduCompatible = false;
      issues.push(`声道数${channels}不被支持，百度API仅支持单声道`);
    }

    if (estimatedDuration > 60) {
      baiduCompatible = false;
      issues.push(`音频时长${estimatedDuration.toFixed(1)}秒超过60秒限制`);
    }

    if (buffer.length > 10 * 1024 * 1024) { // 10MB
      baiduCompatible = false;
      issues.push(`文件大小${(buffer.length / 1024 / 1024).toFixed(1)}MB过大`);
    }

    return {
      format,
      sampleRate,
      channels,
      bitRate: avgBitRate,
      mode: format,
      frameCount,
      estimatedDuration,
      baiduCompatible,
      compatibilityIssues: issues
    };
  }
}